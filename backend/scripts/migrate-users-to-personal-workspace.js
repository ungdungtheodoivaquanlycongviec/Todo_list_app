const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Group = require('../src/models/Group.model');
require('dotenv').config();

async function migrateUsersToPersonalWorkspace() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app');
    console.log('Connected to MongoDB');

    // Find all users without currentGroupId or with null currentGroupId
    const usersWithoutGroup = await User.find({ 
      $or: [
        { currentGroupId: { $exists: false } },
        { currentGroupId: null }
      ]
    });

    console.log(`Found ${usersWithoutGroup.length} users without Personal Workspace`);

    for (const user of usersWithoutGroup) {
      try {
        // Check if user already has a Personal Workspace
        const existingPersonalWorkspace = await Group.findOne({
          name: 'Personal Workspace',
          createdBy: user._id
        });

        if (existingPersonalWorkspace) {
          // Update user's currentGroupId
          await User.findByIdAndUpdate(user._id, { 
            currentGroupId: existingPersonalWorkspace._id 
          });
          console.log(`Updated user ${user.email} with existing Personal Workspace`);
          continue;
        }

        // Create Personal Workspace for user
        const personalWorkspace = await Group.create({
          name: 'Personal Workspace',
          description: 'Your personal workspace for tasks and projects',
          createdBy: user._id,
          members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }]
        });

        // Update user's currentGroupId
        await User.findByIdAndUpdate(user._id, { 
          currentGroupId: personalWorkspace._id 
        });

        console.log(`Created Personal Workspace for user ${user.email}`);
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error.message);
      }
    }

    // Also check for users who might be in wrong groups
    console.log('\nChecking for users in wrong groups...');
    const allUsers = await User.find({ currentGroupId: { $exists: true, $ne: null } });
    
    for (const user of allUsers) {
      try {
        const currentGroup = await Group.findById(user.currentGroupId);
        if (!currentGroup) {
          // User's currentGroupId points to non-existent group
          console.log(`User ${user.email} has invalid currentGroupId, creating Personal Workspace...`);
          
          const personalWorkspace = await Group.create({
            name: 'Personal Workspace',
            description: 'Your personal workspace for tasks and projects',
            createdBy: user._id,
            members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }]
          });

          await User.findByIdAndUpdate(user._id, { 
            currentGroupId: personalWorkspace._id 
          });
          
          console.log(`Created Personal Workspace for user ${user.email}`);
        } else {
          // Check if user is actually a member of this group
          const isMember = currentGroup.members.some(member => 
            member.userId.toString() === user._id.toString()
          );
          
          if (!isMember) {
            console.log(`User ${user.email} is not a member of their current group, creating Personal Workspace...`);
            
            const personalWorkspace = await Group.create({
              name: 'Personal Workspace',
              description: 'Your personal workspace for tasks and projects',
              createdBy: user._id,
              members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }]
            });

            await User.findByIdAndUpdate(user._id, { 
              currentGroupId: personalWorkspace._id 
            });
            
            console.log(`Created Personal Workspace for user ${user.email}`);
          }
        }
      } catch (error) {
        console.error(`Error checking user ${user.email}:`, error.message);
      }
    }

    console.log('\nMigration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateUsersToPersonalWorkspace();
