import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Check, Trash2, Bell, AlertCircle, Info, ExternalLink } from 'lucide-react'
import { useGlobalState } from '../context/GlobalState'

function formatRelativeTime(utcTimestamp?: string, fallback = 'recently') {
  if (!utcTimestamp) return fallback

  const timestamp = new Date(utcTimestamp).getTime()
  if (Number.isNaN(timestamp)) return fallback

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSeconds < 60) return 'Just now'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export default function Notification() {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markNotifAsRead,
    markAllNotifsAsRead,
    deleteNotif,
    deleteAllNotifs
  } = useGlobalState()

  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read) {
      await markNotifAsRead(n.id)
    }
    if (n.link) {
      navigate(n.link)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time alerts and activity history.</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotifsAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  <Check size={13} />
                  Mark all read
                </button>
              )}
              <button
                onClick={deleteAllNotifs}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 dark:border-red-900/30 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium"
              >
                <Trash2 size={13} />
                Delete all
              </button>
            </>
          )}
          <button
            onClick={fetchNotifications}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={14} className="text-purple-600" />
            Inbox
            {unreadCount > 0 && (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount} unread
              </span>
            )}
          </h2>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Bell size={36} className="mb-2 opacity-40 text-gray-300 dark:text-gray-700" />
            <p className="text-xs">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {notifications.map((n) => {
              const isUnread = !n.is_read
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 py-3 px-2 rounded-lg transition-colors group ${
                    isUnread
                      ? 'bg-purple-50/20 dark:bg-purple-950/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {n.type === 'doc_failed' || n.type === 'duplicate_upload' ? (
                      <div className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                        <AlertCircle size={13} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Info size={13} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => handleNotificationClick(n)}
                        className="text-xs cursor-pointer text-gray-800 dark:text-gray-200 leading-normal break-words"
                      >
                        {n.title && (
                          <div className={`font-semibold text-purple-600 dark:text-purple-400 mb-0.5 ${isUnread ? 'font-bold' : ''}`}>
                            {n.title}
                          </div>
                        )}
                        <p className={isUnread ? 'font-medium' : ''}>{n.text}</p>
                      </div>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full flex-shrink-0 ml-auto" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 font-medium">{formatRelativeTime(n.created_at, n.time)}</span>
                      {n.link && (
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="flex items-center gap-0.5 text-[10px] text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Go to target
                          <ExternalLink size={8} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <button
                        onClick={() => markNotifAsRead(n.id)}
                        className="w-7 h-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Mark as read"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="w-7 h-7 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 hover:text-red-650"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
