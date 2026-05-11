export type DrawingTool = 'select' | 'pen' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'text'

export interface DrawingElement {
  id: string
  type: DrawingTool
  x: number
  y: number
  width?: number
  height?: number
  x2?: number
  y2?: number
  color: string
  strokeWidth: number
  text?: string
  fontSize?: number
  points?: { x: number; y: number }[]
}

export interface DrawingState {
  tool: DrawingTool
  color: string
  strokeWidth: number
  fontSize: number
  elements: DrawingElement[]
}

export interface GridConfig {
  width: number
  height: number
  columns: number
  rows: number
  colGap: number
  rowGap: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  backgroundImage?: string | null
  bgOffsetX: number
  bgOffsetY: number
}

export interface PresetOption {
  id: string
  name: string
  width: number
  height: number
  note?: string
}

export const PRESET_GROUPS: Record<string, PresetOption[]> = {
  '標準 / 網頁': [
    { id: 'a4',          name: 'A4',               width: 595,  height: 842  },
    { id: 'letter',      name: 'Letter',            width: 612,  height: 792  },
    { id: 'web_desktop', name: '網頁 Desktop',      width: 1440, height: 900  },
    { id: 'web_mobile',  name: '手機 Mobile',       width: 375,  height: 812  },
  ],
  'Facebook': [
    { id: 'fb_cover',  name: '封面照片',       width: 851,  height: 315  },
    { id: 'fb_land',   name: '貼文 (橫式)',    width: 1200, height: 630  },
    { id: 'fb_sq',     name: '貼文 (方形)',    width: 1200, height: 1200 },
    { id: 'fb_story',  name: '限時動態',       width: 1080, height: 1920 },
  ],
  'Instagram': [
    { id: 'ig_sq',    name: '貼文 (方形)',    width: 1080, height: 1080 },
    { id: 'ig_port',  name: '貼文 (直式)',    width: 1080, height: 1350 },
    { id: 'ig_land',  name: '貼文 (橫式)',    width: 1080, height: 566  },
    { id: 'ig_story', name: '限時動態/Reels', width: 1080, height: 1920 },
  ],
  'X (Twitter)': [
    { id: 'x_header', name: '頁首照片',  width: 1500, height: 500 },
    { id: 'x_post',   name: '貼文',      width: 1600, height: 900 },
  ],
  'YouTube': [
    { id: 'yt_cover', name: '頻道封面', width: 2560, height: 1440 },
    { id: 'yt_thumb', name: '影片縮圖', width: 1280, height: 720  },
  ],
}
