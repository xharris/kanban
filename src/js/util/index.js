import { useState, useEffect, useCallback } from "react"
import { useLocation, useHistory } from "react-router-dom"

// api

export const notify = (type, id) =>
  dispatch(`fetch_one_${type}`, {
    detail: { id }
  })

export const useFetch = (fn, type, id, init) => {
  const [result, setResult] = useState(init)
  const fetch = (...args) =>
    fn(...args)
      .then(res => {
        setResult(res)
        return res
      })
      .catch(e => {
        console.error(e)
      })

  const onFetchOne = useCallback(
    e => (e.detail.id == null || id == null || e.detail.id === id) && fetch(id),
    [id]
  )

  // notify subscribers of change
  const notify_type = useCallback(
    diff_id => type && notify(type, diff_id || id),
    [type, id]
  )

  // subscribe to changes
  useEffect(() => {
    if (type) {
      on(`fetch_one_${type}`, onFetchOne)
      return () => {
        off(`fetch_one_${type}`, onFetchOne)
      }
    }
  }, [])

  return [result, fetch, notify_type, setResult]
}

// can be used on a simple api.update(id, data) function
const api_fns = {}
export const useUpdate = ({
  fn,
  type,
  data: initial_data,
  key,
  cooldown,
  skip_notify
}) => {
  const [stateData, setData] = useState(initial_data)
  var is_object = typeof data === "object"
  var data = is_object ? { ...initial_data } : initial_data

  const api_call = (res, rej) =>
    fn(data)
      .then(r => {
        if (data && !skip_notify) notify(type, is_object && data[key || "_id"])
        return res(r)
      })
      .catch(rej)

  const update = new_data =>
    new Promise((res, rej) => {
      // update local copy immediately
      if (typeof new_data === "object") data = { ...stateData, ...new_data }
      else data = new_data
      setData(data)

      if (!cooldown || cooldown === 0) {
        api_call(res, rej)
      } else if (!api_fns[fn]) {
        // update remote copy when off cooldown
        api_fns[fn] = setTimeout(() => {
          api_call(res, rej)
          api_fns[fn] = null
        }, cooldown)
      }
    })

  return [
    stateData,
    update,
    d => {
      setData(d)
      data = d
    }
  ]
}

// event handling

export const dispatch = (...args) =>
  document.dispatchEvent(new CustomEvent(...args))

export const on = (...args) => document.addEventListener(...args)
export const off = (...args) => document.removeEventListener(...args)

// misc

export const cooldown = (time, fn) => {
  var can_call = true

  const wrapper = (...args) => {
    if (can_call) {
      // not on cooldown
      fn(...args)
      can_call = false
      setTimeout(() => {}, time)
    }
  }
}

export const useQuery = () => {
  const { search } = useLocation()
  const { location, replace } = useHistory()
  const [params, setParams] = useState()

  useEffect(() => {
    setParams(new URLSearchParams(search))
  }, [search])

  const updateLocation = useCallback(() => {
    if (params) {
      replace(location.pathname + "?" + params.toString())
    }
  }, [params])

  const setParam = useCallback(
    (k, v) => {
      if (params) {
        if (v) params.set(k, v)
        else params.delete(k)
        updateLocation()
      }
    },
    [params]
  )

  const removeParam = useCallback(
    k => {
      if (params) {
        params.delete(k)
        updateLocation()
      }
    },
    [params]
  )

  return { params, setParam, removeParam }
}

export const useWindowSize = () => {
  const [width, setW] = useState(0)
  const [height, setH] = useState(0)

  const sizeChange = e => {
    setW(window.innerWidth)
    setH(window.innerHeight)
  }

  useEffect(() => {
    window.addEventListener("resize", sizeChange)
    return () => {
      window.removeEventListener("resize", sizeChange)
    }
  }, [])

  return [width, height]
}

export const insertAtCursor = (myField, myValue) => {
  var sel
  //IE support
  if (document.selection) {
    myField.focus()
    sel = document.selection.createRange()
    sel.text = myValue
  }
  //MOZILLA and others
  else if (myField.selectionStart || myField.selectionStart === 0) {
    var startPos = myField.selectionStart
    var endPos = myField.selectionEnd
    myField.value =
      myField.value.substring(0, startPos) +
      myValue +
      myField.value.substring(endPos, myField.value.length)
  } else {
    myField.value += myValue
  }
}