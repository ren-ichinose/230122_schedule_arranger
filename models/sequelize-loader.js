'use strict';
const {Sequelize, DataTypes} = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.POSTGRES_DB_URL);

module.exports = {
  sequelize,
  DataTypes
};