import type { HTMLAttributes, DetailedHTMLProps, CSSProperties } from 'react'

type IconifyIconProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  icon?: string
  width?: string | number
  height?: string | number
  style?: CSSProperties
  inline?: boolean | string
}

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'iconify-icon': IconifyIconProps
    }
  }
}

export type { IconifyIconProps }
