import { useState, useEffect } from 'react';

export default function ConsentModal() {
  const [show, setShow] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('user_consent');
    if (consent !== 'accepted') {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('user_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-notion-bg-dark border border-notion-border-light dark:border-notion-border-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-notion-border-light dark:border-notion-border-dark bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-notion-text-light dark:text-notion-text-dark flex items-center gap-2">
            <span>🛡️</span> 歡迎使用 Logic Hub！請先閱讀並同意使用條款
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark space-y-4">
          {declined ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              <p className="font-semibold mb-2">您已拒絕使用條款</p>
              <p>很抱歉，為確保雙方權益與系統正常運作，您必須同意使用條款及 Cookies 政策才能使用 Logic Hub 服務。如果您改變心意，請點擊下方返回按鈕重新同意。</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">1. 服務使用條款 (Terms of Service)</h3>
                <p className="leading-relaxed">
                  歡迎使用 Logic Hub (懶人包 Wiki)。當您註冊或使用本服務時，即表示您同意遵守以下條款。本平台提供的 AI 摘要分析結果僅供參考，使用者應自行對其上傳之內容（如 YouTube 連結、文章）之版權負責，平台不對第三方內容之智慧財產權負擔保責任。
                </p>
              </div>

              <div>
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">2. Cookies 與隱私權政策 (Privacy & Cookies Policy)</h3>
                <p className="leading-relaxed">
                  為了提供完整的平台功能（如：登入驗證、個人化設定、歷史紀錄），我們必須在您的瀏覽器中存取與使用 Cookies 及 LocalStorage。我們承諾絕不會將您的資料出售給第三方，收集之資料僅用於維持應用程式的正常運作與改善服務體驗。
                </p>
              </div>

              <div>
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">3. 帳號與內容規範</h3>
                <p className="leading-relaxed">
                  使用者應妥善保管登入憑證。若於平台上進行任何違反當地法律之行為，平台有權終止您的帳號服務並移除相關資料。
                </p>
              </div>

              <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                👉 點擊「同意並繼續」即代表您已充分了解並同意上述規範。
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-notion-border-light dark:border-notion-border-dark bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
          {declined ? (
            <button
              onClick={() => setDeclined(false)}
              className="px-4 py-2 rounded-md font-medium text-notion-text-light dark:text-notion-text-dark border border-notion-border-light dark:border-notion-border-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              返回重新閱讀
            </button>
          ) : (
            <>
              <button
                onClick={handleDecline}
                className="px-4 py-2 rounded-md font-medium text-notion-text-muted-light dark:text-notion-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                拒絕
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 rounded-md font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-colors"
              >
                同意並繼續
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
