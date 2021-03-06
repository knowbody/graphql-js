/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

// 80+ char lines are useful in describe/it, so ignore in this file.
/*eslint-disable max-len */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { execute } from '../executor';
import { parse } from '../../language';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
} from '../../type';


var TestInputObject = new GraphQLInputObjectType({
  name: 'TestInputObject',
  fields: {
    a: { type: GraphQLString },
    b: { type: new GraphQLList(GraphQLString) },
    c: { type: new GraphQLNonNull(GraphQLString) }
  }
});

var TestType = new GraphQLObjectType({
  name: 'TestType',
  fields: {
    fieldWithObjectInput: {
      type: GraphQLString,
      args: { input: { type: TestInputObject } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    fieldWithNullableStringInput: {
      type: GraphQLString,
      args: { input: { type: GraphQLString } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    fieldWithNonNullableStringInput: {
      type: GraphQLString,
      args: { input: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    list: {
      type: GraphQLString,
      args: { input: { type: new GraphQLList(GraphQLString) } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    nnList: {
      type: GraphQLString,
      args: { input: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    listNN: {
      type: GraphQLString,
      args: { input: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
    nnListNN: {
      type: GraphQLString,
      args: { input: { type:
        new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
      } },
      resolve: (_, { input }) => JSON.stringify(input)
    },
  }
});

var schema = new GraphQLSchema({ query: TestType });

describe('Execute: Handles input objects', () => {

  describe('Handles objects and nullability', () => {
    describe('using inline structs', () => {
      it('executes with complex input', () => {
        var doc = `
        {
          fieldWithObjectInput(input: {a: "foo", b: ["bar"], c: "baz"})
        }
        `;
        var ast = parse(doc);

        return expect(execute(schema, null, ast)).to.become({
          data: {
            fieldWithObjectInput: '{"a":"foo","b":["bar"],"c":"baz"}'
          }
        });
      });

      it('properly coerces single value to array', () => {
        var doc = `
        {
          fieldWithObjectInput(input: {a: "foo", b: "bar", c: "baz"})
        }
        `;
        var ast = parse(doc);

        return expect(execute(schema, null, ast)).to.become({
          data: {
            fieldWithObjectInput: '{"a":"foo","b":["bar"],"c":"baz"}'
          }
        });
      });
    });

    describe('using variables', () => {
      var doc = `
        query q($input:TestInputObject) {
          fieldWithObjectInput(input: $input)
        }
      `;
      var ast = parse(doc);

      it('executes with complex input', () => {
        var params = {input: {a: 'foo', b: ['bar'], c: 'baz'}};

        return expect(execute(schema, null, ast, null, params)).to.become({
          data: {
            fieldWithObjectInput: '{"a":"foo","b":["bar"],"c":"baz"}'
          }
        });
      });

      it('properly coerces single value to array', () => {
        var params = {input: {a: 'foo', b: 'bar', c: 'baz'}};

        return expect(execute(schema, null, ast, null, params)).to.become({
          data: {
            fieldWithObjectInput: '{"a":"foo","b":["bar"],"c":"baz"}'
          }
        });
      });

      it('errors on null for nested non-null', () => {
        var params = {input: {a: 'foo', b: 'bar', c: null}};

        return expect(execute(schema, null, ast, null, params)).to.become({
          data: null,
          errors: [
            {
              locations: [
                {
                  column: 17,
                  line: 2
                }
              ],
              message: 'Variable $input expected value of type ' +
                       'TestInputObject but got: ' +
                       '{\"a\":\"foo\",\"b\":\"bar\",\"c\":null}.'
            }
          ]
        });
      });

      it('errors on omission of nested non-null', () => {
        var params = {input: {a: 'foo', b: 'bar'}};

        return expect(execute(schema, null, ast, null, params)).to.become({
          data: null,
          errors: [
            {
              locations: [
                {
                  column: 17,
                  line: 2
                }
              ],
              message: 'Variable $input expected value of type ' +
                       'TestInputObject but got: {\"a\":\"foo\",\"b\":\"bar\"}.'
            }
          ]

        });
      });
    });
  });

  describe('Handles nullable scalars', () => {
    it('allows nullable inputs to be omitted', () => {
      var doc = `
      {
        fieldWithNullableStringInput
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNullableStringInput: 'null'
        }
      });
    });

    it('allows nullable inputs to be omitted in a variable', () => {
      var doc = `
      query SetsNullable($value: String) {
        fieldWithNullableStringInput(input: $value)
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNullableStringInput: 'null'
        }
      });
    });

    it('allows nullable inputs to be omitted in an unlisted variable', () => {
      var doc = `
      query SetsNullable {
        fieldWithNullableStringInput(input: $value)
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNullableStringInput: 'null'
        }
      });
    });

    it('allows nullable inputs to be set to null in a variable', () => {
      var doc = `
      query SetsNullable($value: String) {
        fieldWithNullableStringInput(input: $value)
      }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {value: null})
      ).to.become({
        data: {
          fieldWithNullableStringInput: 'null'
        }
      });
    });

    it('allows nullable inputs to be set to null directly', () => {
      var doc = `
      {
        fieldWithNullableStringInput(input: null)
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNullableStringInput: 'null'
        }
      });
    });

    it('allows nullable inputs to be set to a value in a variable', () => {
      var doc = `
      query SetsNullable($value: String) {
        fieldWithNullableStringInput(input: $value)
      }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {value: 'a'})
      ).to.become({
        data: {
          fieldWithNullableStringInput: '"a"'
        }
      });
    });

    it('allows nullable inputs to be set to a value directly', () => {
      var doc = `
      {
        fieldWithNullableStringInput(input: "a")
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNullableStringInput: '"a"'
        }
      });
    });
  });

  describe('Handles non-nullable scalars', () => {
    it('does not allow non-nullable inputs to be omitted in a variable', () => {
      var doc = `
        query SetsNonNullable($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 31,
                line: 2
              }
            ],
            message: 'Variable $value expected value of type String! but ' +
                     'got: undefined.'
          }
        ]
      });
    });

    it('does not allow non-nullable inputs to be set to null in a variable', () => {
      var doc = `
        query SetsNonNullable($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {value: null})
      ).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 31,
                line: 2
              }
            ],
            message: 'Variable $value expected value of type String! but ' +
                     'got: null.'
          }
        ]
      });
    });

    it('allows non-nullable inputs to be set to a value in a variable', () => {
      var doc = `
        query SetsNonNullable($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {value: 'a'})
      ).to.become({
        data: {
          fieldWithNonNullableStringInput: '"a"'
        }
      });
    });

    it('allows non-nullable inputs to be set to a value directly', () => {
      var doc = `
      {
        fieldWithNonNullableStringInput(input: "a")
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNonNullableStringInput: '"a"'
        }
      });
    });

    it('passes along null for non-nullable inputs if explcitly set in the query', () => {
      var doc = `
      {
        fieldWithNonNullableStringInput
      }
      `;
      var ast = parse(doc);

      return expect(execute(schema, null, ast)).to.become({
        data: {
          fieldWithNonNullableStringInput: 'null'
        }
      });
    });
  });

  describe('Handles lists and nullability', () => {
    it('allows lists to be null', () => {
      var doc = `
        query q($input:[String]) {
          list(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: null})
      ).to.become({
        data: {
          list: 'null'
        }
      });
    });

    it('allows lists to contain values', () => {
      var doc = `
        query q($input:[String]) {
          list(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A']})
      ).to.become({
        data: {
          list: '["A"]'
        }
      });
    });

    it('allows lists to contain null', () => {
      var doc = `
        query q($input:[String]) {
          list(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A',null,'B']})
      ).to.become({
        data: {
          list: '["A",null,"B"]'
        }
      });
    });

    it('does not allow non-null lists to be null', () => {
      var doc = `
        query q($input:[String]!) {
          nnList(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: null})
      ).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 17,
                line: 2
              }
            ],
            message: 'Variable $input expected value of type [String]! but ' +
                     'got: null.'
          }
        ]
      });
    });

    it('allows non-null lists to contain values', () => {
      var doc = `
        query q($input:[String]!) {
          nnList(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A']})
      ).to.become({
        data: {
          nnList: '["A"]'
        }
      });
    });

    it('allows non-null lists to contain null', () => {
      var doc = `
        query q($input:[String]!) {
          nnList(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A',null,'B']})
      ).to.become({
        data: {
          nnList: '["A",null,"B"]'
        }
      });
    });

    it('allows lists of non-nulls to be null', () => {
      var doc = `
        query q($input:[String!]) {
          listNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: null})
      ).to.become({
        data: {
          listNN: 'null'
        }
      });
    });

    it('allows lists of non-nulls to contain values', () => {
      var doc = `
        query q($input:[String!]) {
          listNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A']})
      ).to.become({
        data: {
          listNN: '["A"]'
        }
      });
    });

    it('does not allow lists of non-nulls to contain null', () => {
      var doc = `
        query q($input:[String!]) {
          listNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A',null,'B']})
      ).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 17,
                line: 2
              }
            ],
            message: 'Variable $input expected value of type [String!] but ' +
                     'got: [\"A\",null,\"B\"].'
          }
        ]
      });
    });

    it('does not allow non-null lists of non-nulls to be null', () => {
      var doc = `
        query q($input:[String!]!) {
          nnListNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: null})
      ).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 17,
                line: 2
              }
            ],
            message: 'Variable $input expected value of type [String!]! but ' +
                     'got: null.'
          }
        ]
      });
    });

    it('allows non-null lists of non-nulls to contain values', () => {
      var doc = `
        query q($input:[String!]!) {
          nnListNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A']})
      ).to.become({
        data: {
          nnListNN: '["A"]'
        }
      });
    });

    it('does not allow non-null lists of non-nulls to contain null', () => {
      var doc = `
        query q($input:[String!]!) {
          nnListNN(input: $input)
        }
      `;
      var ast = parse(doc);

      return expect(
        execute(schema, null, ast, null, {input: ['A',null,'B']})
      ).to.become({
        data: null,
        errors: [
          {
            locations: [
              {
                column: 17,
                line: 2
              }
            ],
            message: 'Variable $input expected value of type [String!]! but ' +
                     'got: [\"A\",null,\"B\"].'
          }
        ]
      });
    });
  });
});
