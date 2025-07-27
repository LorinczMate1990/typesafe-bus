type MessageMustHaveTopic = {
  topic: string;
};

type Callback<Message> = (message: Message) => void | boolean | Promise<void> | Promise<boolean>;

export interface Publish<Message extends MessageMustHaveTopic> {
  publish(message: Message): Promise<void>;  
}

export interface Subscribe<Message extends MessageMustHaveTopic> {
  subscribe(callback: Callback<Message>): number;
  unsubscribe(id: number): boolean;
  isSubscribed(id: number): boolean;
}

export interface MessageCombinator<Message extends MessageMustHaveTopic> {
  combine(older : Message, newer : Message) : Message | undefined;
}

class MessageQueue<Message extends MessageMustHaveTopic> {
  private queue : Message[] = [];
  private combinator? : MessageCombinator<Message>;
  
  getLength() {
    return this.queue.length;
  }

  makeEmpty() {
    this.queue = [];
  }

  constructor(combinator? : MessageCombinator<Message>) {
    this.combinator = combinator;
  }

  push(message : Message) {
    if (this.queue.length < 1 || this.combinator == undefined) {
      this.queue.push(message);
      return;  
    }
    
    let combinedMessage : Message | undefined = undefined;
    do {
      const lastIndex = this.queue.length-1;
      const older = this.queue[lastIndex];
      combinedMessage = this.combinator.combine(older, message);
      if (combinedMessage !== undefined) {
        this.queue.pop();
        message = combinedMessage;
      }
    } while (this.queue.length > 0 && combinedMessage !== undefined);
    this.queue.push(message);
  }

  [Symbol.iterator](): Iterator<Message> {
    let index = 0;
    const data = this.queue;

    return {
      next(): IteratorResult<Message> {
        if (index < data.length) {
          return { value: data[index++], done: false };
        } else {
          return { value: undefined as any, done: true };
        }
      },
    };
  }  
}

class PubSub<Message extends MessageMustHaveTopic> implements Publish<Message>, Subscribe<Message> {
  private callbacks: Map<number, Callback<Message>> = new Map();
  private idCounter: number = 0;
  private messageQueue: MessageQueue<Message>;

  constructor(combinator? : MessageCombinator<Message>) {
    this.messageQueue = new MessageQueue(combinator);
  }

  private generateId(): number {
    return ++this.idCounter;
  }

  getQueueLength() {
    return this.messageQueue.getLength();
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

  addToQueue(message: Message) {
    this.messageQueue.push(message);
  }

  async publish(newMessage?: Message): Promise<void> {
    if (newMessage != null) {
      this.messageQueue.push(newMessage);
    }
    for (const message of this.messageQueue) {
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

      if (asyncOps.length > 0) {
        await Promise.all(asyncOps);
      }
    }
    
    this.messageQueue.makeEmpty();
  }
}

export default PubSub;