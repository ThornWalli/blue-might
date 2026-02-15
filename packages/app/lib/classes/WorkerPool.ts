/* eslint-disable @typescript-eslint/no-explicit-any */
type Job = {
  payload: unknown;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

export class WorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Job[] = [];

  constructor(url: URL, size = 6) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(url, { type: 'module' });
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.idle = [];
    this.queue = [];
  }

  exec(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.idle.length && this.queue.length) {
      const worker = this.idle.pop()!;
      const job = this.queue.shift()!;
      const onMessage = (ev: MessageEvent<any>) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        this.idle.push(worker);
        job.resolve(ev.data);
        this.dispatch();
      };
      const onError = (err: ErrorEvent) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        this.idle.push(worker);
        job.reject(err.message);
        this.dispatch();
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage(job.payload);
    }
  }
}
