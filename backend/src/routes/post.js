const { Api } = require("../api")
const { ref, status, queryCheck, types } = require("../api/util")
const { tag } = require("./tag")
const { group } = require("./group")
const { user } = require("./user")
const { follow } = require("./follow")
const { post_settings } = require("./post_settings")

const post = new Api(
  "post",
  {
    content: { type: String, default: "", required: true },
    settings: post_settings,
    user: ref("user"),
    group: [ref("group")],
    mention: [ref("user")],
    comment: { type: [ref("comment")], default: [] },
    reaction: { type: [ref("reaction")], default: [], unique: true }
  },
  {
    schema: { toJSON: { getters: true }, toObject: { getters: true } }
  }
)
post.schema.index({ content: "text" })

post.auth.any = ["/add", "/update", "/delete", "/feed"]

post.router.post("/add", async (req, res) => {
  const [group, user] = Api.get("group", "user")
  const tags = req.body.tags || []

  const doc = await post.model.create({
    ...req.body,
    user: req.user._id,
    group: await Promise.all(
      tags
        .filter(m => m.type === "group")
        .map(
          async ({ value: name }) => await group.model.findOne({ name }).lean()
        )
    ),
    mention: await Promise.all(
      tags
        .filter(m => m.type === "user")
        .map(
          async ({ value: username }) =>
            await user.model.findOne({ username }).lean()
        )
    )
  })
  status(201, res, { _id: doc._id })
  post.emit("create", doc._id)
})

post.router.patch("/update", async (req, res) => {
  const [group, user] = Api.get("group", "user")
  const tags = req.body.tags || []

  post.model
    .findByIdAndUpdate(req.body._id, {
      ...req.body,
      group: await Promise.all(
        tags
          .filter(m => m.type === "group")
          .map(
            async ({ value: name }) =>
              await group.model.findOne({ name }).lean()
          )
      ),
      mention: await Promise.all(
        tags
          .filter(m => m.type === "user")
          .map(
            async ({ value: username }) =>
              await user.model.findOne({ username }).lean()
          )
      )
    })
    .exec((err, doc) => {
      if (!queryCheck(res, err, doc)) {
        status(200, res, { doc })
        post.emit("update", doc._id)
      }
    })
})

post.router.delete("/delete", (req, res) =>
  post.model
    .deleteOne({
      _id: req.body.id,
      user: req.user._id
    })
    .exec(err => {
      !queryCheck(res, err, true) && status(200, res)
      post.emit("delete", req.body.id)
    })
)

post.router.get("/user/:id", async (req, res) =>
  post.model
    .find({ user: await user.model.usernameToDocId(req.params.id) })
    .populate({ path: "user", model: user.model })
    .populate({ path: "group", model: group.model })
    .populate({ path: "mention", model: user.model })
    .exec(
      (err, docs) => !queryCheck(res, err, docs) && status(200, res, { docs })
    )
)

post.router.post("/tag", async (req, res) => {
  const tag_ids = await tag.model
    .find({
      value: { $in: req.body.tags },
      request: false
    })
    .select("_id")
    .exec()

  return post.model
    .find({ tags: { $all: tag_ids } })
    .populate({ path: "user", model: user.model })
    .populate({ path: "group", model: group.model })
    .populate({ path: "mention", model: user.model })
    .exec(
      (err, docs) => !queryCheck(res, err, docs) && status(200, res, { docs })
    )
})

post.router.get("/:id", async (req, res) =>
  post.model
    .findById(req.params.id)
    .populate({ path: "user", model: user.model })
    .populate({ path: "group", model: group.model })
    .populate({ path: "mention", model: user.model })
    .exec((err, doc) => !queryCheck(res, err, doc) && status(200, res, { doc }))
)

/* query
{
  usernames: [],
  user_ids: [],
  tags: [], // empty for all tags
  sort: '', // newest, oldest, controversial, popular
  following: t/f
}
*/
post.router.post("/query", async (req, res) => {
  const query = {}
  const users = req.body.usernames
    ? (
        await user.model.find({ username: req.body.usernames }, "_id").lean()
      ).map(u => u._id)
    : req.body.user_ids || []
  if (users.length > 0) {
    if (!query.$or) query.$or = []
    query.$or.push(
      {
        user: users
      },
      {
        mention: users
      }
    )
  }

  // GROUPS
  let groups = req.body.groups
    ? (
        await group.model
          .find({ name: req.body.groups.filter(g => g) }, "_id")
          .lean()
      ).map(t => t._id)
    : []

  groups = groups.filter(async g => {
    if (g.privacy === "private") {
      // is user allowed to look at this?
      return (
        req.user &&
        (await follow.model.exists({
          source_user: req.user._id,
          type: "group",
          group: g._id
        }))
      )
    }
    return true
  })

  // construct final query
  if (groups.length > 0) query.group = groups
  console.log("query", query)

  let posts = await post.model
    .find(query)
    .populate({ path: "user", model: user.model })
    .populate({ path: "group", model: group.model })
    .populate({ path: "mention", model: user.model })
    .exec()

  if (req.body.size === "small") {
    posts = posts.map(p => {
      p = p.toObject()
      p.content = p.content.slice(0, 300)
      return p
    })
  }

  return (
    !queryCheck(res, "NO_POSTS", posts) && status(200, res, { docs: posts })
  )
})

module.exports = { post, post_settings }
