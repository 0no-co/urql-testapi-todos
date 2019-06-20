# urql-testapi-todos

This is a testing GraphQL API for [`urql`](https://github.com/FormidableLabs/urql) and serves a list of todos,
generated using Faker.

It is predeployed for our examples and can be used for any small `urql` example.

The data for this API is preserved in a cookie, so no data will be shared between
different users of the API and no data will be preserved forever. This keeps
this service stateless.

[It's currently automatically deployed by ZEIT Now](https://urql-testapi-todos.philpl.now.sh/)
