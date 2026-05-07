declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          icon?: string
          width?: string | number
          height?: string | number
          style?: React.CSSProperties
          inline?: boolean | string
        },
        HTMLElement
      >
    }
  }
}

export {}
