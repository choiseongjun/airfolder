-- Support lookups and joins that start from a member account (account linking, shared-crew checks).
CREATE INDEX IF NOT EXISTS group_members_viewer_group ON snaproom.group_members(viewer_id,group_id);
