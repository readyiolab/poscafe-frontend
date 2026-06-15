declare module 'toastify-js' {
  interface ToastifyOptions {
    text?: string;
    duration?: number;
    gravity?: 'top' | 'bottom';
    position?: 'left' | 'center' | 'right';
    style?: Record<string, string>;
  }
  interface ToastifyInstance {
    showToast(): void;
  }
  function Toastify(options: ToastifyOptions): ToastifyInstance;
  export default Toastify;
}
