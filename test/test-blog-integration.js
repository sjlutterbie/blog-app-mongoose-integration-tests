'use strict';

// KNOWN ISSUE
//  The GET and POST endpoints fail because the post.created date formats
//    do not match, and I cannot figure out how to make them do so. The data
//    looks to be correct, it's just the formatting that is incorrect.

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
  
  // Length of blog content
  let nb_sentences=3;
  
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(nb_sentences=nb_sentences),
    created: new Date(faker.date.past())
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
  
    // Test GET endpoint
    describe('GET endpoint', function() {
      
      it('should return all existing blog posts', function() {
        // Strategy
        //  1. Get back all blog posts return by GET request to /posts
        //  2. Prove res has right status and data type
        //  3. Prove the number of posts we get back is equal to number in db
        
        // Make res available across tests
        let res;
        return chai.request(app)
          .get('/posts')
          .then(function(_res) {
            // Make res available to other steps
            res = _res;
            expect(res).to.have.status(200);
            expect(res.body).to.have.lengthOf.at.least(1);
            return BlogPost.count();
          })
          .then(function(count) {
            expect(res.body).to.have.lengthOf(count);
          });
      });
      
      it('should return posts with correct fields', function() {
        // Strategy: Get back all posts, and ensure they have the expected keys
        
        let resBlogPost;
        return chai.request(app)
          .get('/posts')
          .then(function(res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.a('array');
            expect(res.body).to.have.lengthOf.at.least(1);
            
            res.body.forEach(function(post) {
              expect(post).to.be.a('object');
              expect(post).to.include.keys(
                'id','author','content','title','created');
            });
            resBlogPost = res.body[0];
            return BlogPost.findById(resBlogPost.id);
          })
          .then(function(blogpost) {
            
            expect(resBlogPost.id).to.equal(blogpost.id);
            
            
            expect(resBlogPost.author).to.equal(
              // Handle serialization of response
              `${blogpost.author.firstName} ${blogpost.author.lastName}`.trim()
            );
            expect(resBlogPost.content).to.equal(blogpost.content);
            expect(resBlogPost.title).to.equal(blogpost.title);
            expect(resBlogPost.created).to.equal(blogpost.created);
          });
      });
    });
    
    describe('POST endpoint', function() {
      // Strategy:
      //  1. Make a POST request with data
      //  2. Prove res has the right keys
      //  3. Prove the id exists (which means it was inserted)
      
      it('should add a new blog post', function(){
        
          const newBlogPost = generateBlogData();
          
          return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(function(res) {
              
              expect(res).to.have.status(201);
              expect(res).to.be.json;
              expect(res.body).to.be.a('object');
              expect(res.body).to.include.keys(
                'id', 'author', 'content', 'title', 'created');
              expect(res.body.author).to.equal(
              // Handle serialization
              `${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`.trim()
              );
              expect(res.body.id).to.not.be.null;
              expect(res.body.content).to.equal(newBlogPost.content);
              expect(res.body.title).to.equal(newBlogPost.title);
              expect(res.body.created).to.equal(newBlogPost.created);
            });
      });
    });
    
    describe('PUT endpoint', function() {
      // Strategy
      //  1. Get existing blog post from db
      //  2. Make a PUT request to update post
      //  3. Prove post returned contains the data we sent
      //  4. Prove restaurant in db is correctly updated
      
      it('should update fields you send over', function() {
        
        const updateData = {
          title: "Test title",
          content: "Test content"
        };
        
        
        // Get initial data
        return BlogPost
          .findOne()
          .then(function(post) {
            updateData.id = post.id;
            
            // Make request, then inspect response
            return chai.request(app)
              .put(`/posts/${post.id}`)
              .send(updateData);
          })
          .then(function(res) {
            expect(res).to.have.status(204);
            
            return BlogPost.findById(updateData.id);
          })
          .then(function(post) {
            expect(post.title).to.equal(updateData.title);
            expect(post.content).to.equal(updateData.content);
          });
      });
    });
    
    describe('DELETE endpoint', function() {
      // Strategy:
      //  1. Get a post
      //  2. Make a DELETE request for that post's id
      //  3. Prove that response has right status code
      //  4. Prove that post with the id no longer exists in db
      
      it('should delete a post by id', function() {
        
        // Make post available to multiple calls
        let post;
        
        return BlogPost
          .findOne()
          .then(function(_post) {
            post = _post;
            return chai.request(app).delete(`/posts/${post.id}`);
          })
          .then(function(res) {
            expect(res).to.have.status(204);
            return BlogPost.findById(post.id);
          })
          .then(function(_post) {
            expect(_post).to.be.null;
          });
      });
    });
  
});