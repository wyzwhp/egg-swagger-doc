'use strict';

const path = require('path');
const staticCache = require('koa-static-cache');
const { documentInit, getFuncBundler } = require('../document/index');
const { convertControllerPath } = require('./util');
const fs = require('fs');
const _ = require('lodash');

module.exports = {

  /**
   * 注册SwaggerUI基础路由
   */
  basicRouterRegister: app => {

    // swaggerUI json字符串访问地址
    app.get('/swagger-doc', ctx => {
      ctx.response.status = 200;
      ctx.response.type = 'application/json';
      ctx.response.body = documentInit(app);
    });
    app.logger.info('[egg-swagger-doc] register router: get /swagger-doc');

    // swaggerUI的静态资源加入缓存，配置访问路由
    const swaggerH5 = path.join(__dirname, '../../app/public');
    app.use(staticCache(swaggerH5, {}, {}));
    app.logger.info('[egg-swagger-doc] register router: get /swagger-ui.html');

    const template = fs.readFileSync(path.join(__dirname, '../../app/public/swagger-ui.html.template'), 'utf-8');
    const { routers = [] } = app.config.swaggerdoc;
    routers.forEach(routerPath => {
      const documentConfig = _.cloneDeep(documentInit(app));
      // documentConfig.basePath = routerPath;

      let newTages = [];
      _.map(documentConfig.paths, (val, key) => {
        if (key.includes(routerPath)) {
          newTages = newTages.concat(Object.values(val).reduce((a, b) => a.concat(b.tags), []));
        } else {
          delete documentConfig.paths[key];
        }
      });

      // 重置tags
      const tagsInfo = {};
      documentConfig.tags.forEach(item => {
        tagsInfo[item.name] = item;
      });
      documentConfig.tags = Array.from(new Set(newTages)).map(key => tagsInfo[key]);

      app.get(`${routerPath}/doc`, async ctx => {
        ctx.response.status = 200;
        ctx.response.type = 'text/html';
        ctx.response.body = template.replace('$swaggerDocUrl', `${routerPath}/doc/json`);
      });
      app.get(`${routerPath}/doc/json`, ctx => {
        ctx.response.status = 200;
        ctx.response.type = 'application/json';
        ctx.response.body = documentConfig;
      });
    });

  },
  /**
   * 注册扫描到的路由
   */
  RouterRegister: app => {
    const funcBundler = getFuncBundler(app);
    // const rules = getValidateRuler(app);
    const { router, controller } = app;

    for (let obj of funcBundler) {
      let instance = require(obj.filePath);

      let fileExtname = path.extname(obj.filePath);
      let direct = `${obj.filePath.split(fileExtname)[0].split('app' + path.sep)[1]}`;

      if (fileExtname === '.ts') {
        instance = instance.default;
      }

      for (let req of obj.routers) {

        // if (app.config.swaggerdoc.enableValidate && router.ruleName) {

        //   app[router.method](router.route.replace('{', ':').replace('}', ''), function (ctx, next) {

        //     app.logger.info(`[egg-swagger-doc] validate ${router.ruleName}`);
        //     // app.logger.info(JSON.stringify(rules[router.ruleName]));
        //     return next();
        //   }, controller[router.func]);

        // } else {

        if (instance.prototype) {
          const control = convertControllerPath(instance.prototype.pathName, controller);
          router[req.method](req.route.replace('{', ':').replace('}', ''), control[req.func]);
        } else {
          router[req.method](req.route.replace('{', ':').replace('}', ''), instance[req.func]);
        }
        // }
        app.logger.info(`[egg-swagger-doc] register router: ${req.method} ${req.route} for ${direct.replace(path.sep, '-')}-${req.func} `);
      }

    }
  },

};
