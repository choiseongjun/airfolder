BEGIN;
ALTER TABLE snaproom.trip_story_entries DROP CONSTRAINT IF EXISTS trip_story_entries_animal_check;
ALTER TABLE snaproom.trip_story_entries ADD CONSTRAINT trip_story_entries_animal_check
CHECK(animal IN ('cat','dog','otter','rabbit','bear','hamster','fox','panda','koala','raccoon','squirrel','hedgehog','deer','sloth','tiger','lion','elephant','giraffe','penguin','duck','owl','chick','flamingo','parrot','seal','dolphin','whale','turtle','octopus','frog'));
COMMIT;
