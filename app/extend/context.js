'use strict';
const { getValidateRuler } = require('../../lib/contract/index');
const { documentInit } = require('../../lib/document/index');

const RULE = Symbol('Context#rule');
const SWAGGER = Symbol('Context#swagger');
module.exports = {
  get rule() {
    if (!this[RULE]) {

      this[RULE] = getValidateRuler(this.app);

    }
    return this[RULE];
  },
  get swagger() {
    if (!this[SWAGGER]) {

      this[SWAGGER] = documentInit(this.app);

    }
    return this[SWAGGER];
  },
};
