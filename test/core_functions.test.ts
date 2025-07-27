import PubSub, { MessageCombinator } from '../src/index';

describe('PubSub', () => {
  type Message = { topic: "dummy" | "clever", id: number }; // Example Message type, can be modified
  let pubsub: PubSub<Message>;

  beforeEach(() => {
    pubsub = new PubSub<Message>();
  });

  test('subscribe adds a callback and returns a random ID', () => {
    const callback = (message: Message) => { };
    const id = pubsub.subscribe(callback);
    expect(typeof id).toBe('number');
  });

  test('unsubscribe removes a callback by id and returns true if successful', () => {
    const callback = (message: Message) => { };
    const id = pubsub.subscribe(callback);
    expect(pubsub.unsubscribe(id)).toBe(true);
    expect(pubsub.isSubscribed(id)).toBe(false);
  });

  test('unsubscribe returns false if the ID does not exist', () => {
    expect(pubsub.unsubscribe(999)).toBe(false);
  });

  test('publish calls all subscribed callbacks with the message', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    pubsub.subscribe(callback1);
    pubsub.subscribe(callback2);

    const message: Message = { topic: "dummy", id: 123 };
    pubsub.publish(message);

    expect(callback1).toHaveBeenCalledWith(message);
    expect(callback2).toHaveBeenCalledWith(message);
  });

  test('callbacks returning true are removed after publish', () => {
    const callback1 = (message: Message) => true;
    const callback2 = (message: Message) => false;
    const id1 = pubsub.subscribe(callback1);
    const id2 = pubsub.subscribe(callback2);

    pubsub.publish({ topic: "dummy", id: 123 });

    expect(pubsub.isSubscribed(id1)).toBe(false);
    expect(pubsub.isSubscribed(id2)).toBe(true);
  });

  test('isSubscribed checks if a subscription with a given id exists', () => {
    const callback = (message: Message) => { };
    const id = pubsub.subscribe(callback);
    expect(pubsub.isSubscribed(id)).toBe(true);
    expect(pubsub.isSubscribed(999)).toBe(false);
  });

  test('publish should resolve after all async callbacks are completed', async () => {
    const asyncCallback = jest.fn().mockResolvedValueOnce(true);
    pubsub.subscribe(asyncCallback);

    const message: Message = { topic: "dummy", id: 123 };
    await pubsub.publish(message);

    expect(asyncCallback).toHaveBeenCalledWith(message);
    // Further assertions can be made to ensure proper handling of async callbacks
  });

  test('publish should call sync callbacks immediately and async callbacks after await', async () => {
    const syncCallback1 = jest.fn();
    const syncCallback2 = jest.fn();
    const syncCallback3 = jest.fn();
    const asyncCallback1 = jest.fn().mockResolvedValueOnce(false);
    const asyncCallback2 = jest.fn().mockResolvedValueOnce(false);

    pubsub.subscribe(syncCallback1);
    pubsub.subscribe(syncCallback2);
    pubsub.subscribe(syncCallback3);
    pubsub.subscribe(asyncCallback1);
    pubsub.subscribe(asyncCallback2);

    const message: Message = { topic: "dummy", id: 123 };
    const promise = pubsub.publish(message);

    // Check that synchronous callbacks are called immediately
    expect(syncCallback1).toHaveBeenCalledWith(message);
    expect(syncCallback2).toHaveBeenCalledWith(message);
    expect(syncCallback3).toHaveBeenCalledWith(message);

    // Await the publish to complete async callbacks
    await promise;

    // Check that asynchronous callbacks are also called
    expect(asyncCallback1).toHaveBeenCalledWith(message);
    expect(asyncCallback2).toHaveBeenCalledWith(message);
  });


  test('async callback returning true should be removed after publish', async () => {
    const asyncCallback = jest.fn().mockResolvedValueOnce(true);
    const asyncCallback2 = jest.fn().mockResolvedValueOnce(false);


    const id = pubsub.subscribe(asyncCallback);
    const id2 = pubsub.subscribe(asyncCallback2);

    const message: Message = { topic: "dummy", id: 123 };
    await pubsub.publish(message);

    // Check that the async callback was called
    expect(asyncCallback).toHaveBeenCalledWith(message);

    // Check that the callback is removed
    expect(pubsub.isSubscribed(id)).toBe(false);
    expect(pubsub.isSubscribed(id2)).toBe(true);
  });

  describe("testing message combination and queue", () => {
    describe("addToQueu must add messages to the queue and publish must process them", () => {
      let syncCallback1: jest.Mock;
      let message: Message;

      beforeEach(() => {
        syncCallback1 = jest.fn();
        pubsub.subscribe(syncCallback1);
        message = { topic: "dummy", id: 123 };
        for (let i = 0; i < 100; ++i) {
          pubsub.addToQueue(message);
        }
      });

      test('addToQueue does not dispatch messages immediately', () => {
        expect(syncCallback1).not.toHaveBeenCalled();
        expect(pubsub.getQueueLength()).toBe(100);
      });

      test('publish dispatches all queued messages', () => {
        pubsub.publish();
        expect(pubsub.getQueueLength()).toBe(0);
        expect(syncCallback1).toHaveBeenCalledTimes(100);
      });
    });

    describe("Messages of the same topic must be able to combined", () => {
      class ParityMessageCombinator implements MessageCombinator<Message> {
        combine(older: Message, newer: Message): Message | undefined {
          if (older.topic != newer.topic) return; // Theoretically, should not happen
          if (older.id % 2 == newer.id % 2) return older;
        }
      }
      beforeEach(() => {
        let combinator = new ParityMessageCombinator();
        pubsub = new PubSub<Message>(combinator);
      });

      test("When messages cannot be combined, they must be preserved", () => {
        for (let i = 0; i < 100; ++i) {
          pubsub.addToQueue({topic: 'dummy', id: i});
        }
        expect(pubsub.getQueueLength()).toBe(100);
      });

      test("When messages can be combined, they must be combined", () => {
        for (let i = 0; i < 100; ++i) {
          pubsub.addToQueue({topic: 'dummy', id: i*2});
        }
        expect(pubsub.getQueueLength()).toBe(1);
      });

      test("Messages must be able to combined in a more complicated pattern", () => {
        for (let i = 0; i < 100; ++i) {
          pubsub.addToQueue({topic: 'dummy', id: i});
          pubsub.addToQueue({topic: 'dummy', id: i+2});
        }
        expect(pubsub.getQueueLength()).toBe(100);
      });

      test("Messages of different topics should not interfere with combining", () => {
        for (let i = 0; i < 100; ++i) {
          pubsub.addToQueue({topic: 'dummy', id: 0});
          pubsub.addToQueue({topic: 'clever', id: 1});
        }
        expect(pubsub.getQueueLength()).toBe(2);
      });
    });
  });
});
