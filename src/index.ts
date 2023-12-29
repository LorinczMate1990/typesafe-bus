type MessageMustHaveTopic = {
  topic: string;
  // Additional properties can be added here if needed
};

type Callback<Message> = (message: Message) => void | boolean | Promise<void> | Promise<boolean>;

class PubSub<Message extends MessageMustHaveTopic> {
  private callbacks: Map<number, Callback<Message>>;
  private idCounter: number;

  constructor() {
    this.callbacks = new Map();
    this.idCounter = 0;
  }

  private generateId(): number {
    return ++this.idCounter;
  }

  subscribe(callback: Callback<Message>): number {
    const id = this.generateId();
    this.callbacks.set(id, callback);
    return id;
  }

  unsubscribe(id: number): boolean {
    return this.callbacks.delete(id);
  }

  isSubscribed(id: number): boolean {
    return this.callbacks.has(id);
  }

  async publish(message: Message): Promise<void> {
    const asyncOps: Promise<void>[] = [];

    this.callbacks.forEach((callback, id) => {
      const result = callback(message);

      if (result instanceof Promise) {
        asyncOps.push(
          result.then((shouldRemove) => {
            if (shouldRemove === true) {
              this.callbacks.delete(id);
            }
          })
        );
      } else if (result === true) {
        this.callbacks.delete(id);
      }
    });

    await Promise.all(asyncOps);
  }
}

export default PubSub;