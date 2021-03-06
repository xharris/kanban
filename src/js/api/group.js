import * as api from "."
import { useFetch } from "util"

export const search = term =>
  api.post("group/search", { term }, { withCredentials: true })

export const useSearch = () =>
  useFetch(term => search(term).then(res => res.data.docs))

export const create = data =>
  api.put("group/create", data, { withCredentials: true })
export const update = data =>
  api.put(`group/update/${data._id}`, data, { withCredentials: true })
export const get = name => api.get(`group/${encodeURI(name)}`)
