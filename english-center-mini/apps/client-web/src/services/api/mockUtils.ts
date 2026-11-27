/** Chỉ dùng trong chế độ Mock (phát triển giao diện). Giả lập độ trễ mạng. */
export const mockDelay = (ms = 200) => new Promise<void>((resolve) => setTimeout(resolve, ms))
