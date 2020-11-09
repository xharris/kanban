/**
 * Usage:
 *
 * const { api, schema, types } = require("./api")
 *
 * const thing = schema({
 *   value: types.Mixed
 * })
 *
 * const new_api_table = api("new_api_table", {
 *   name: String,
 *   otherthing: { type: [thing], default: [] }
 * })
 *
 * new_api_table.router.add()
 *
 */

const {
  randomColor,
  status,
  securePass,
  secureHash,
  verifyHash
} = require("./util")
const { generateJwt, verifyJwt } = require("./jwt")

const nanoid = require("nanoid")
const mongoose = require("mongoose")
const express = require("express")
const { readdir } = require("fs")
const { join } = require("path")

const checkSchema = obj => {
  for (const v in obj) {
    switch (obj[v]) {
      case "shortid":
        obj[v] = { type: String, default: () => nanoid(10) }
        break
      case "color":
        obj[v] = { type: String, default: () => randomColor() }
        break
    }
  }
  return obj
}

const Schema = (obj, options, ...args) => {
  const schema = new mongoose.Schema(
    checkSchema(obj),
    {
      ...options,
      timestamps: {
        createdAt: "date_created",
        updatedAt: "date_modified"
      }
    },
    ...args
  )

  // schema.statics.add =
  /*
  const query_check = function (doc) {
    const r = queryCheck(res, "USER_NOT_FOUND", doc)
    console.log("find middleware")
    //next()
  }
  schema.post("findOne", query_check)
*/
  return schema
}

const Model = (name, _schema) => mongoose.model(name, _schema)

const Router = opt => {
  express.Router()
}

class Api {
  constructor(name, ...args) {
    this.name = name
    this.schema = Schema(...[].concat(...args))
    // this.model = Model(name, this.schema)
    this.router = express.Router()

    this.router.use((req, res, accept) => {
      this.createModel()

      const deny = err => status(403, res, { message: err || "BAD_TOKEN" })
      if (!this.auth.includes(req.path)) return accept()

      const { user } = require("../routes/user")
      const { token } = req.body
      delete req.body.token
      if (!token) return deny() // no id or token given
      return new Promise((pres, rej) => {
        // decode the jwt
        verifyJwt(token, (err, data) => {
          if (err) return deny()
          //if (data.data !== id) return deny() // incorrect user
          // verify username and pass
          user.model.findOne({ id: data.data }).exec(async function (err, doc) {
            if (err || !doc) return deny("USER_NOT_FOUND") // user not found
            // success
            req.user = doc
            return accept()
          })
        })
      })
    })

    if (this.router) backend.app.use(`/api/${this.name}`, this.router)
    this.auth = []
  }
  createModel() {
    if (!this.model) this.model = Model(this.name, this.schema)
  }
  reModel() {
    this.model = Model(this.name, this.schema)
  }
}

const backend = {
  start: options => {
    const express = require("express")
    const bodyParser = require("body-parser")
    const cors = require("cors")
    const app = express()

    backend.app = app

    const { port, whitelist } = options

    const corsOptions = {
      origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
          callback(null, true)
        } else {
          callback(new Error("Not allowed by CORS"))
        }
      }
    }

    const helmet = require("helmet") // creates headers to protect from attacks
    const morgan = require("morgan") // logs requests. ok??
    const csp = require("helmet-csp")
    app.use(helmet())
    app.use(cors(corsOptions))
    app.use(
      bodyParser.urlencoded({
        extended: true
      })
    )
    app.use(
      bodyParser.json({
        limit: "8mb",
        extended: true
      })
    )
    app.use(morgan("combined")) // tiny/combined
    app.use(
      csp({
        directives: {
          defaultSrc: [`'self'`],
          imgSrc: [`'self'`]
        }
      })
    )

    const mongoose = require("mongoose")
    mongoose.set("debug", options.debug)
    mongoose.set("useFindAndModify", false)
    mongoose
      .connect(`mongodb://127.0.0.1:27017/${options.name}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      .catch(e => {
        console.error("Connection error", e.message)
      })
    mongoose.set("useCreateIndex", true)
    mongoose.pluralize(null)
    const db = mongoose.connection

    db.on("error", console.error.bind(console, "MongoDB connection error:"))

    app.get("/", (req, res) => {
      res.send("Hello Warudo!")
    })

    const requireDir = (dir, no_recursion) =>
      new Promise((res, rej) => {
        readdir(dir, { withFileTypes: true }, (err, files) => {
          if (err) return rej()
          const imports = []
          files.forEach(f => {
            if (f.isDirectory() && !no_recursion) requireDir(join(dir, f.name))
            else if (f.isFile() && f.name !== "index.js") {
              imports.push(join(dir, f.name))
            }
          })
          Promise.all(imports.map(f => require(f)))
            .then(res)
            .catch(console.error)
        })
      })

    requireDir(
      join(__dirname, "../routes"),
      options.skip_recursive_require
    ).then(data => {
      app.listen(port, () => console.log(`Server running on port ${port}`))
    })
  }
}

module.exports = {
  checkSchema,
  Api,
  Schema,
  Model,
  Router,
  backend
}
