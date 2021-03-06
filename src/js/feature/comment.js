import React, { useState, useEffect } from "react"
import Avatar from "feature/avatar"
import Text from "component/text"
import Markdown from "component/markdown"
import CommentInput from "feature/commentinput"
import Button from "component/button"
import { useAuthContext } from "component/auth"
import * as apiComment from "api/comment"
import { useListen, pluralize } from "util"
import { block, cx, css } from "style"

const bss = block("comment")

const Comment = ({ id, data: _data, showReplies: _showReplies }) => {
  const [data, setData] = useState(_data)
  const [showReplyInput, setShowReplyInput] = useState()
  const [showReplies, setShowReplies] = useState(_showReplies)
  const { user } = useAuthContext()

  useEffect(() => {
    if (id && !_data) {
      apiComment.get(id).then(res => setData(res.data.doc))
    }
  }, [id, _data])

  return data ? (
    <div className={bss()}>
      <div className={bss("main")}>
        <Avatar user={data.user} size="small" />
        <Markdown
          className={bss("markdown")}
          content={data.content}
          size="full"
        />
        {user && (
          <Button
            className={bss("reply")}
            icon="Add"
            onClick={() => setShowReplyInput(true)}
          />
        )}
      </div>
      {showReplyInput ? (
        <CommentInput
          commentid={data._id}
          active={true}
          onCancel={setShowReplyInput}
        />
      ) : (
        <div className={bss("replies")}>
          {data.comment.length > 0 && (
            <Text
              className={bss("count")}
              amt={40}
              themed
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies
                ? `hide comment${pluralize(data.comment.length, "s")}`
                : `${data.comment.length} comment${pluralize(
                    data.comment.length,
                    "s"
                  )}`}
            </Text>
          )}
          {showReplies && data.comment.map(c => <Comment key={c} id={c} />)}
        </div>
      )}
    </div>
  ) : (
    "..."
  )
}

export default Comment
