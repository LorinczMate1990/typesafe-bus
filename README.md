
# typesafe-bus

`typesafe-bus` is a lightweight, TypeScript-based pub-sub (publish-subscribe) library providing type-safe message passing. Ideal for both client and server-side applications, it allows for decoupled communication between different parts of your application with strong type enforcement.

## Features

- Type-safe publish-subscribe pattern.
- Supports both synchronous and asynchronous callbacks.
- Flexible topic-based subscription.

## Installation

Install `typesafe-bus` using npm:

```
npm install typesafe-bus
```

Or using yarn:

```
yarn add typesafe-bus
```

## Usage

First, import `PubSub` from `typesafe-bus`:

```typescript
import PubSub from 'typesafe-bus';
```

Define a message type with a `topic` property:

```typescript
type MyMessage = {
  topic: "myTopic" | "anotherTopic";
  data: any;  // Replace 'any' with your specific data type
};
```

Create a `PubSub` instance:

```typescript
const pubsub = new PubSub<MyMessage>();
```

Subscribe to a topic with a callback:

```typescript
const callback = (message: MyMessage) => {
  console.log(message.data);
};

const subscriptionId = pubsub.subscribe(callback);
```

Publish a message:

```typescript
pubsub.publish({ topic: "myTopic", data: "Hello World!" });
```

Unsubscribe when done:

```typescript
pubsub.unsubscribe(subscriptionId);
```

## API

### Callback\<Message\> function type

The `Callback` type in the `typesafe-bus` package is a function type designed to handle messages with a specific structure. It can handle both synchronous and asynchronous processing of messages, and may optionally return a value or a promise. The `Callback` type is defined as follows:

` ` `typescript
type Callback<Message> = (message: Message) => void | boolean | Promise<void> | Promise<boolean>;
` ` `

### Details:

1. **Function Type**: `Callback` is a function type, allowing for the execution of custom logic when a message is received.

2. **Generic Parameter (`Message`)**: It employs a generic parameter `Message`, making it adaptable to various message types that comply with defined constraints (such as having a `topic` property).

3. **Parameter**: The function takes a single parameter, `message`, of the generic `Message` type.

4. **Return Types**:
   - `void`: Indicates that the callback does not return any value.
   - `boolean`: A return value of `true` may signal a request to unsubscribe from the pub-sub system.
   - `Promise<void>`: Used for asynchronous operations where no specific return value is needed.
   - `Promise<boolean>`: Applies to asynchronous operations where a resolution to `true` might indicate a request to unsubscribe.

### `subscribe(callback: Callback<Message>): number`

Subscribe to messages. The callback is called with a message. Returns a subscription ID.

### `unsubscribe(id: number): boolean`

Unsubscribe from messages using the subscription ID. Returns `true` if successful.

### `publish(message: Message): Promise<void>`

Publish a message to all subscribers. Returns a `Promise` that resolves when all (including async) callbacks are completed.

### `isSubscribed(id: number): boolean`

Check if a subscription with a given ID is active.

## Contributing

Contributions are welcome! Please read our contributing guidelines for details.

## License

Distributed under the MIT License. See `LICENSE` for more information.
