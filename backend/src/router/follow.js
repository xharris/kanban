import api, { ref } from "../api"
import { add } from "../api/controller"
import { useAuth } from "./user"

const follow = api("follow", {
  source_user: ref("user", { unique: true }),
  type: { type: String, enum: ["tag", "user"] },
  user: ref("user", { unique: true }),
  tag: ref("tag", { unique: true })
})

// follow/user: { user }
follow.router.post(
  "user",
  useAuth((req, res, user) =>
    add({
      req,
      res,
      model: follow.model,
      body: () => {
        req.body.source_user = user
        req.body.type = "user"
      }
    })
  )
)

export default follow