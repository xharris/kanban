var fs = require("fs")
var resolve = require("path").resolve
var join = require("path").join
var cp = require("child_process")
var os = require("os")

// get library path
var lib = resolve(__dirname)

fs.readdirSync(lib).forEach(function (mod) {
  var modPath = join(lib, mod)
  // ensure path has package.json
  if (!fs.existsSync(join(modPath, "package.json"))) return
  console.log(`### updating ${modPath} ###`)

  // npm binary based on OS
  var npmCmd = os.platform().startsWith("win") ? "yarn.cmd" : "yarn"

  // install folder
  cp.spawn(npmCmd, [], { env: process.env, cwd: modPath, stdio: "inherit" })
})
