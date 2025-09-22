"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = hasRole;
exports.canGhostMode = canGhostMode;
exports.canDeleteMessages = canDeleteMessages;
function hasRole(user, role) {
    return user.roles.includes(role);
}
function canGhostMode(user) {
    return user.ogLevel >= 4;
}
function canDeleteMessages(user) {
    return user.ogLevel >= 4 || user.roles.includes('moderator') || user.roles.includes('admin');
}
