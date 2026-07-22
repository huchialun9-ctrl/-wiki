export const templates = [
  {
    id: 'podcast',
    title: 'Podcast / 訪談腳本',
    description: '適合整理雙人對談、訪談節目的腳本大綱與重點記錄。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "blue", textAlignment: "left" }, content: "Podcast 節目企劃：[節目名稱]" },
      { type: "paragraph", props: { textColor: "gray" }, content: "填寫指南：請在此處記錄節目基本資訊，確保錄音前所有參與者對齊目標。" },
      { type: "bulletListItem", content: "預定錄音時間：YYYY-MM-DD HH:MM" },
      { type: "bulletListItem", content: "預計發布時間：YYYY-MM-DD HH:MM" },
      { type: "bulletListItem", content: "主持人：[姓名]" },
      { type: "bulletListItem", content: "特別來賓：[姓名] (來賓頭銜 / 相關社群連結)" },
      
      { type: "heading", props: { level: 2 }, content: "📌 節目主軸與核心設定" },
      { type: "bulletListItem", content: "節目核心目標：(例如：帶領聽眾了解 2024 年前端開發趨勢，並分享實戰經驗)" },
      { type: "bulletListItem", content: "目標受眾 (TA)：(例如：初中階軟體工程師、轉職者)" },
      { type: "bulletListItem", content: "預計錄製時長：45 - 60 分鐘" },
      { type: "bulletListItem", content: "節目調性：(例如：輕鬆幽默 / 專業硬核 / 溫馨感人)" },

      { type: "heading", props: { level: 2 }, content: "🎬 節目流程大綱" },
      { type: "heading", props: { level: 3 }, content: "00:00 - 05:00 開場與來賓介紹 (Hook & Intro)" },
      { type: "bulletListItem", content: "主持人開場白 (破冰閒聊，帶出今日主題)" },
      { type: "bulletListItem", content: "來賓自我介紹 (請來賓用 1-2 分鐘介紹自己的背景與目前正在做的事)" },

      { type: "heading", props: { level: 3 }, content: "05:00 - 25:00 第一階段：深入探討主題 A" },
      { type: "paragraph", props: { textColor: "gray" }, content: "此階段著重於背景介紹與痛點挖掘。" },
      { type: "checkListItem", content: "Q1: 當時怎麼會想開始投入這個領域？有什麼契機嗎？" },
      { type: "checkListItem", content: "Q2: 在這過程中，遇到最大的挫折是什麼？當時怎麼解決？" },

      { type: "heading", props: { level: 3 }, content: "25:00 - 45:00 第二階段：實戰經驗與進階分享" },
      { type: "paragraph", props: { textColor: "gray" }, content: "此階段著重於給予聽眾具體建議與乾貨。" },
      { type: "checkListItem", content: "Q3: 如果有聽眾也想嘗試，你會建議他們從哪裡開始？" },
      { type: "checkListItem", content: "Q4: 業界常說的ＯＯ迷思，你的實戰看法是什麼？" },

      { type: "heading", props: { level: 2 }, content: "💡 結尾與 Call to Action (Outro & CTA)" },
      { type: "bulletListItem", content: "主持人總結今日 3 大重點" },
      { type: "bulletListItem", content: "來賓工商時間 (近期活動宣傳、書籍出版、電子報訂閱等)" },
      { type: "bulletListItem", content: "引導聽眾行動 (例如：到 Apple Podcast 留下五星好評、追蹤 IG、加入 Discord 群組)" }
    ]
  },
  {
    id: 'video',
    title: 'YouTube 影片企劃案',
    description: '從發燒標題發想到分鏡腳本，快速建立影片製作大綱。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "red", textAlignment: "left" }, content: "YouTube 影片企劃：[影片暫定主題]" },
      { type: "paragraph", props: { textColor: "gray" }, content: "填寫指南：YouTube 企劃需要高度吸睛，請特別著重在縮圖與開場前 5 秒的設計。" },
      { type: "bulletListItem", content: "預計拍攝日：YYYY-MM-DD" },
      { type: "bulletListItem", content: "預定上片日：YYYY-MM-DD" },
      { type: "bulletListItem", content: "負責企劃：[姓名]" },
      { type: "bulletListItem", content: "影片類型：(例如：開箱實測 / 教學攻略 / VLOG / 訪談對話)" },

      { type: "heading", props: { level: 2 }, content: "🎯 影片定位與流量密碼設定" },
      { type: "bulletListItem", content: "目標觀眾 (TA)：(例如：想買 iPhone 16 但還在觀望的消費者)" },
      { type: "bulletListItem", content: "這支影片要解決什麼問題？：" },
      { type: "bulletListItem", content: "競爭對手分析 (同主題別人怎麼做？我們有什麼不同？)：" },
      
      { type: "heading", props: { level: 3 }, content: "🔥 發燒標題發想 (至少 3-5 個備選)" },
      { type: "checkListItem", content: "備選標題一：" },
      { type: "checkListItem", content: "備選標題二：" },
      { type: "checkListItem", content: "備選標題三：" },

      { type: "heading", props: { level: 3 }, content: "🖼️ 縮圖視覺構想 (Thumbnail Concept)" },
      { type: "paragraph", content: "畫面左邊放ＯＯ，右邊放大大的人物表情，加上斗大的黃色字體標語：「千萬別買！」" },

      { type: "heading", props: { level: 2 }, content: "📝 完整分鏡腳本 (A Roll & B Roll)" },
      { type: "heading", props: { level: 3 }, content: "00:00 - 00:30 開場黃金 30 秒 (Hook)" },
      { type: "paragraph", props: { backgroundColor: "gray" }, content: "【視覺】特寫產品畫面 + 震撼音效\n【口白】「大家都說這是年度神機，但實測一個月後，我發現了三個致命缺點...」" },
      
      { type: "heading", props: { level: 3 }, content: "00:30 - 03:00 痛點分析與案例示範" },
      { type: "paragraph", props: { backgroundColor: "gray" }, content: "【視覺】切換到棚內主講 (A Roll) + 穿插操作畫面 (B Roll)\n【口白】詳細解說問題發生的情境..." },
      
      { type: "heading", props: { level: 3 }, content: "03:00 - 08:00 解決方案與實測數據" },
      { type: "paragraph", props: { backgroundColor: "gray" }, content: "【視覺】跑分圖表動畫 + 實際改善後的對比畫面\n【口白】提出解決方案與實測心得..." },
      
      { type: "heading", props: { level: 3 }, content: "08:00 - 10:00 總結與 CTA" },
      { type: "paragraph", props: { backgroundColor: "gray" }, content: "【視覺】訂閱動畫跳出\n【口白】總結購買建議，引導觀眾按讚訂閱並在下方留言互動。" },

      { type: "heading", props: { level: 2 }, content: "🛠️ 拍攝資源與前置作業清單" },
      { type: "checkListItem", content: "確認場地租借與時間" },
      { type: "checkListItem", content: "準備所需拍攝道具 (列出清單：如腳架、特殊燈具、要開箱的產品)" },
      { type: "checkListItem", content: "搜集並整理要當作 B Roll 補充的素材與圖片版權" }
    ]
  },
  {
    id: 'meeting',
    title: '團隊會議紀錄',
    description: '快速記錄會議結論與待辦事項，確保團隊同步。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "green", textAlignment: "left" }, content: "團隊會議紀錄：[會議主題]" },
      { type: "paragraph", props: { textColor: "gray" }, content: "會議宗旨：確保跨部門資訊同步，並產出明確的下一步行動計畫 (Action Items)。" },
      { type: "bulletListItem", content: "會議日期：YYYY-MM-DD HH:MM" },
      { type: "bulletListItem", content: "與會人員：[姓名列舉]" },
      { type: "bulletListItem", content: "缺席人員：[姓名列舉]" },
      { type: "bulletListItem", content: "會議記錄人：[姓名]" },

      { type: "heading", props: { level: 2 }, content: "📋 會議前置資料 (Pre-read materials)" },
      { type: "bulletListItem", content: "參考文件連結 1" },
      { type: "bulletListItem", content: "數據分析報表連結 2" },

      { type: "heading", props: { level: 2 }, content: "🗣️ 本次會議重點與討論過程" },
      { type: "heading", props: { level: 3 }, content: "議程一：[議題名稱]" },
      { type: "paragraph", content: "討論細節摘要，包含不同部門提出的觀點與擔憂。例如：行銷部認為ＯＯＯ，但技術部反映會有ＯＯ的技術限制。" },
      
      { type: "heading", props: { level: 3 }, content: "議程二：[議題名稱]" },
      { type: "paragraph", content: "討論細節摘要..." },

      { type: "heading", props: { level: 2 }, content: "✅ 會議決議事項 (Key Decisions)" },
      { type: "paragraph", props: { textColor: "gray" }, content: "請簡明扼要地列出最終達成的共識。" },
      { type: "bulletListItem", content: "決議一：同意於下個月推出版面大改版，放棄舊版支援。" },
      { type: "bulletListItem", content: "決議二：預算上限提高至 $50,000 以應付額外的行銷曝光。" },

      { type: "heading", props: { level: 2 }, content: "🚀 待辦事項 (Action Items)" },
      { type: "paragraph", props: { textColor: "gray" }, content: "每項任務必須包含「負責人」與「明確的截止期限」。" },
      { type: "checkListItem", content: "負責人：[人名] | 任務：完成改版設計草圖 | 期限：YYYY-MM-DD" },
      { type: "checkListItem", content: "負責人：[人名] | 任務：聯繫三家行銷代理商進行比稿 | 期限：YYYY-MM-DD" },
      { type: "checkListItem", content: "負責人：[人名] | 任務：撰寫本季財務預算申請書 | 期限：YYYY-MM-DD" },

      { type: "heading", props: { level: 2 }, content: "📅 下次會議預告" },
      { type: "bulletListItem", content: "預定日期：YYYY-MM-DD HH:MM" },
      { type: "bulletListItem", content: "預定追蹤事項：(例如：追蹤上述設計草圖的進度)" }
    ]
  }
];
