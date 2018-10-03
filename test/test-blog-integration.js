'use strict';

// Load modules
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// Simplify expect() calls
const expect = chai.expect;

// Load code elements
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// Functions for creating fake data
function seedBlogData() {
  
  console.info('Seeding blog data...');
  const seedData = [];
  
  // Generate 11 blog entries
  for (let i=0; i <=10; i++) {
    seedData.push(generateBlogData());
  }
  
  return BlogPost.insertMany(seedData);
  
}

// Generate data elements to include in db entry
function generateBlogData() {
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(nb_sentences=3),
    created: faker.date.past()
  };
}

// Delete the database after testing
function tearDownDb() {
  console.warn('Deleting database...');
  return mongoose.connection.dropDatabase();
}

// Build testing suite
describe('Blog API resource', function() {
  
  // Set before/after functions to return promises
    // Create database
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
    
    // seed Data
    beforeEach(function() {
      return seedBlogData();
    });
    
    // tear down DB
    afterEach(function() {
      return tearDownDb();
    });
    
    // Close server
    after(function() {
      return closeServer();
    });
  
});