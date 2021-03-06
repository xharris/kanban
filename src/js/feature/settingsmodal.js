import React, { useState, useEffect } from "react"
import { useHistory } from "react-router-dom"
import OverflowDialog from "component/overflowdialog"
import Form, { Group } from "component/form"
import Text from "component/text"
import Button from "component/button"
import Separator from "component/separator"
import ColorPicker from "component/colorpicker"
import Input from "component/input"
import { useAuthContext } from "component/auth"
import { useParams } from "react-router-dom"
import { useFetch } from "util"
import * as apiUser from "api/user"
import * as apiFollow from "api/follow"

import { block } from "style"

const bss = block("settingsmodal")

const SettingsModal = ({ data: defaultValue, withSearch, ...props }) => {
  const { user } = useAuthContext()
  const [newGroup, setNewGroup] = useState(!withSearch)
  const history = useHistory()
  const [theme, fetchTheme, updateTheme] = apiUser.useTheme(
    () => user && fetchTheme(user.username)
  )

  useEffect(() => {
    if (user) {
      fetchTheme(user.username)
    }
  }, [user])

  return (
    <OverflowDialog className={bss()} closeButton {...props}>
      {user && theme && (
        <Group title="Appearance">
          <ColorPicker
            key="color1"
            defaultValue={theme.primary}
            title="Choose a primary color"
            label="Primary color"
            onChange={e => updateTheme({ primary: e.target.value })}
          />
          <ColorPicker
            key="color2"
            defaultValue={theme.secondary}
            title="Choose a secondary color"
            label="Secondary color"
            onChange={e => updateTheme({ secondary: e.target.value })}
          />
          <Input
            defaultValue={user.display_name}
            placeholder="Display name"
            submitIcon="Check"
            onSubmit={v => apiUser.updateDispName(v)}
          />
        </Group>
      )}
    </OverflowDialog>
  )
}

export default SettingsModal
