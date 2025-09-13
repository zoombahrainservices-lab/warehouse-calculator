declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: any) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: string
              size?: string
              type?: string
              text?: string
              shape?: string
              logo_alignment?: string
              width?: string
            }
          ) => void
        }
      }
    }
  }
}

export {}





