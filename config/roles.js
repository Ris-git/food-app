
const allPermissions = {
  // Menu Permissions
  CREATE_MENU: 'create:menu',
  EDIT_MENU: 'edit:menu',
  DELETE_MENU: 'delete:menu',
  
  // Order Permissions
  PLACE_ORDER: 'place:order',
  UPDATE_ORDER_STATUS: 'update:order_status',
  
  // User Management Permissions
  VIEW_USERS: 'view:users',
  MANAGE_USERS: 'manage:users',
};

const roles = {
  customer: [
    allPermissions.PLACE_ORDER
  ],
  restaurant: [
    allPermissions.CREATE_MENU,
    allPermissions.EDIT_MENU,
    allPermissions.DELETE_MENU,
    allPermissions.UPDATE_ORDER_STATUS
  ],
  driver: [
    allPermissions.UPDATE_ORDER_STATUS
  ],
  admin: Object.values(allPermissions) 
};

module.exports = {
  roles,
  permissions: allPermissions
};