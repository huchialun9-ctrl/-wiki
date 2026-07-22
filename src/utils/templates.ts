export const templates = [
  {
    id: 'podcast',
    title: 'Podcast / 訪談腳本',
    description: '適合整理雙人對談、訪談節目的腳本大綱與重點記錄。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "blue", textAlignment: "left" }, content: "Podcast 節目企劃：[節目名稱]" },
      { type: "paragraph", content: "錄音時間：YYYY-MM-DD\n主持人：\n來賓：" },
      { type: "heading", props: { level: 2 }, content: "📌 節目主軸與大綱" },
      { type: "bulletListItem", content: "本集核心目標：分享 [主題] 的實戰經驗" },
      { type: "bulletListItem", content: "預計時長：45 分鐘" },
      { type: "heading", props: { level: 2 }, content: "💬 訪談 Q&A 列表" },
      { type: "heading", props: { level: 3 }, content: "Q1. 請來賓簡單自我介紹？" },
      { type: "paragraph", props: { textColor: "gray" }, content: "預計回答重點：..." },
      { type: "heading", props: { level: 3 }, content: "Q2. 在實作 [主題] 時，遇到最大的困難是什麼？" },
      { type: "paragraph", props: { textColor: "gray" }, content: "預計回答重點：..." },
      { type: "heading", props: { level: 2 }, content: "💡 結尾 Call to Action (CTA)" },
      { type: "paragraph", content: "感謝觀眾收聽，請大家訂閱頻道並在下方留言分享心得！" }
    ]
  },
  {
    id: 'video',
    title: 'YouTube 影片企劃案',
    description: '從發燒標題發想到分鏡腳本，快速建立影片製作大綱。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "red", textAlignment: "left" }, content: "YouTube 影片企劃：[影片主題]" },
      { type: "paragraph", content: "預計拍攝日：YYYY-MM-DD\n上片日：YYYY-MM-DD\n負責企劃：" },
      { type: "heading", props: { level: 2 }, content: "🎯 影片定位與標題發想" },
      { type: "bulletListItem", content: "目標觀眾 (TA)：" },
      { type: "bulletListItem", content: "備選標題一：" },
      { type: "bulletListItem", content: "備選標題二：" },
      { type: "bulletListItem", content: "備選標題三：" },
      { type: "heading", props: { level: 2 }, content: "📝 分鏡腳本大綱 (A Roll)" },
      { type: "heading", props: { level: 3 }, content: "00:00 - 01:00 開場 Hook" },
      { type: "paragraph", content: "（用最吸引人的重點或懸念開場）" },
      { type: "heading", props: { level: 3 }, content: "01:00 - 05:00 痛點分析與案例" },
      { type: "paragraph", content: "（提出問題並給出實際案例）" },
      { type: "heading", props: { level: 3 }, content: "05:00 - 08:00 解決方案與實作" },
      { type: "paragraph", content: "（教學或分享解法）" },
      { type: "heading", props: { level: 2 }, content: "🛠️ 所需資源清單" },
      { type: "checkListItem", content: "道具清單" },
      { type: "checkListItem", content: "參考 B Roll 素材清單" }
    ]
  },
  {
    id: 'meeting',
    title: '團隊會議紀錄',
    description: '快速記錄會議結論與待辦事項，確保團隊同步。',
    blocks: [
      { type: "heading", props: { level: 1, textColor: "green", textAlignment: "left" }, content: "團隊會議紀錄：[會議主題]" },
      { type: "paragraph", content: "日期：YYYY-MM-DD\n參與者：\n記錄人：" },
      { type: "heading", props: { level: 2 }, content: "📋 本次會議重點" },
      { type: "bulletListItem", content: "重點討論事項 1" },
      { type: "bulletListItem", content: "重點討論事項 2" },
      { type: "heading", props: { level: 2 }, content: "✅ 決議事項 (Decisions)" },
      { type: "paragraph", props: { backgroundColor: "gray" }, content: "1. 決議一：...\n2. 決議二：..." },
      { type: "heading", props: { level: 2 }, content: "🚀 待辦事項 (Action Items)" },
      { type: "checkListItem", content: "[人名] 負責完成 A 任務 (Deadline: XX/XX)" },
      { type: "checkListItem", content: "[人名] 負責完成 B 任務 (Deadline: XX/XX)" }
    ]
  }
];
