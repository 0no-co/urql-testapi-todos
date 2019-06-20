const url = require('url');
const cors = require('cors');
const faker = require('faker');
const express = require('express');
const cookie = require('cookie-parser');
const { ApolloServer, gql } = require('apollo-server-express');

// Keep faker non-random to output deterministic data
faker.seed(40955);

const COOKIE_NAME = 'todo-data';
const MAX_PHRASES = 100;
const PHRASES = [];

// Generate a new todo item; this will output the same items in
// order of it being called
const genHackerTodo = () => {
  const verb = faker.hacker.verb();
  const noun = faker.hacker.noun();
  return `${verb} ${noun}`;
};

// Get the todo at index; old todos will be pushed to an array in order
// so that we generate the same Faker data every time
const getHackerTodo = id => {
  if (typeof id !== 'number' || id < 0 || id > MAX_PHRASES) {
    return null;
  }

  const size = PHRASES.length;
  for (let i = size; i <= id; i++) {
    PHRASES.push(genHackerTodo());
  }

  return PHRASES[id];
};

const typeDefs = gql`
  type Query {
    todos: [Todo!]
  }

  type Mutation {
    toggleTodo(id: ID!): Todo
    addTodo: [Todo!]
  }

  type Todo {
    id: ID
    text: String
    complete: Boolean
  }
`;

const getTodos = cookieData => {
  return cookieData.map((isDone, id) => {
    const text = getHackerTodo(id);
    const complete = !!isDone;
    return { id, text, complete };
  });
}

const resolvers = {
  Query: {
    todos: (_, __, context) => {
      const { cookieData } = context;
      return getTodos(cookieData);
    }
  },
  Mutation: {
    toggleTodo: (_, { id }, context) => {
      const { cookieData } = context;
      const index = typeof id === 'string' ? parseInt(id, 10) : id;

      if (index < 0 || index >= cookieData.length) {
        return null;
      }

      const newCookieData = [...cookieData];
      const complete = (newCookieData[index] = !newCookieData[index]);
      const text = getHackerTodo(index);

      updateCookieData(context.req, context.res, newCookieData);

      return { id: index, text, complete };
    },
    addTodo: (_, __, context) => {
      const { cookieData } = context;
      const newCookieData = [...cookieData, false];

      updateCookieData(context.req, context.res, newCookieData);

      return getTodos(newCookieData);
    }
  }
};

// We save the completed state and length of data in a short cookie
const updateCookieData = (req, res, cookieData) => {
  let origin = req.get('Origin');
  if (!origin) {
    origin = req.hostname;
  } else {
    origin = url.parse(origin).host || req.hostname;
  }

  res.cookie(
    COOKIE_NAME,
    JSON.stringify(cookieData),
    {
      maxAge: 9000000,
      httpOnly: true
    }
  );
};

const context = ({ req, res }) => {
  let cookieData

  try {
    cookieData = JSON.parse(req.cookies[COOKIE_NAME]);
  } catch (_err) {}

  if (!cookieData || !Array.isArray(cookieData)) {
    cookieData = [false, false, false];
  }

  return { cookieData, req, res };
};

const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  cacheControl: false,
  introspection: true,
  playground: {
    settings: {
      'request.credentials': 'include'
    }
  }
});

const app = express();

app.use(cookie());
app.use(cors({ origin: true, credentials: true }));

apollo.applyMiddleware({
  app,
  path: '/',
  cors: false
});

module.exports = app;
