import { status } from "./util"

export const queryCheck = (res, err, doc) => {
  if (err && err.code) {
    switch (err.code) {
      case 11000: // duplicate key
        return status(403, res, { message: `DUPLICATE` })
      default:
        return status(500, res, { message: err.message })
    }
  }
  if (!doc) return status(404, res, { message: err })
}

export const add = async ({ req, res, model, body }) => {
  if (!req.body) return status(400, res, { message: `NO_BODY` })
  model.create(body ? await body(req) : req.body, async function (err, doc) {
    const r = queryCheck(res, err, doc)
    if (r) return r
    await doc.save()
    return status(201, res, {
      _id: doc._id,
      message: `SUCCESS`
    })
  })
}

export const updateById = ({ req, res, model, id, bodyMod }) => {
  if (!req.body)
    return status(400, res, { message: `Provide a body to update` })
  model.findById(id, async function (err, doc) {
    const r = queryCheck(res, err, doc)
    if (r) return r
    // use req.body to modify doc
    var body = req.body
    for (const key in body) {
      doc[key] = body[key]
    }
    if (bodyMod) bodyMody(body)
    // finalize changes
    await doc.save()
    return status(201, res, {
      message: "SUCCESS"
    })
  })
}

export const updateOne = ({ req, res, model, query, bodyMod }) => {
  if (!req.body)
    return status(400, res, { message: `Provide a body to update` })

  if (bodyMod) req.body = bodyMod(req.body) || req.body
  model.updateOne(
    query,
    req.body,
    { runValidators: true, omitUndefined: true },
    function (err, doc) {
      if (!queryCheck(res, err, doc)) {
        return status(201, res, {
          message: `SUCCESS`
        })
      }
    }
  )
}

export const getById = async ({ res, model, id, doc: cb_doc }) => {
  if (!id) return status(400, res, { message: `Provide id` })
  return await model.findById(id).exec(function (err, doc) {
    const r = queryCheck(res, err, doc)
    if (r) return r

    if (cb_doc) cb_doc(doc)
    return status(201, res, {
      data: doc,
      message: "SUCCESS"
    })
  })
}

export const get = async ({ res, model, query, cb }) => {
  if (!query) return status(400, res, { message: `Provide query parameters` })
  return await model.findOne(query).exec(cb)
}

export const getAll = async ({ res, model, query, cb }) => {
  if (!query) return status(400, res, { message: `Provide query parameters` })
  return await model.find(query).exec(cb)
}

export const removeById = async ({ res, model, id }) => {
  if (!id) return status(400, res, { message: `Provide id` })
  return await model.deleteOne({ _id: id }).exec(function (err) {
    if (err) return status(400, res, { message: err })
    else
      return status(201, res, {
        message: `SUCCESS`
      })
  })
}