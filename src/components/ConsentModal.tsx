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
            <span>👋</span> 歡迎來到 Logic Hub
          </h2>
          <p className="text-sm text-notion-text-muted-light dark:text-notion-text-muted-dark mt-1">
            在開始打造您的專屬懶人包之前，我們需要您花一分鐘了解我們的服務與隱私守則。
          </p>
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
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">1. 關於您的內容與智慧財產權</h3>
                <p className="leading-relaxed">
                  Logic Hub 是一個協助您高效整理資訊的工具。請放心，您在使用過程中上傳的任何連結、文件或產出的摘要，其版權皆歸屬於您或原作者所有。身為使用者，請確保您分析的內容未侵犯他人的智慧財產權，我們也不會將您的專案內容私自挪作他用。
                </p>
              </div>

              <div>
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">2. 我們如何保護您的隱私</h3>
                <p className="leading-relaxed">
                  為了讓您擁有最流暢的體驗（例如保持登入狀態、儲存您的偏好設定與專案進度），系統會使用必要的 Cookies 與本機儲存空間 (LocalStorage)。我們非常重視您的隱私，承諾絕對不會將您的個人資料與瀏覽紀錄出售給任何廣告商或第三方機構。
                </p>
              </div>

              <div>
                <h3 className="font-bold text-notion-text-light dark:text-notion-text-dark text-base mb-2">3. 友善的使用環境</h3>
                <p className="leading-relaxed">
                  我們致力於打造一個安全、高效的協作平台。請妥善保管您的帳號密碼，並與我們一起維持良好的網路環境。若發現任何惡意濫用系統資源或違反法律的行為，我們保留暫停該帳號服務的權利。
                </p>
              </div>

              <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                👉 點選下方「同意並繼續」，即代表您已了解並同意上述規範，準備好開始您的效率之旅！
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
