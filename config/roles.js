const allPermissions = {
  // Menu Permissions
  CREATE_MENU: 'create:menu',
  EDIT_MENU: 'edit:menu',
  DELETE_MENU: 'delete:menu',
  MANAGE_MENU: 'manage:menu',
  
  // Order Permissions
  PLACE_ORDER: 'place:order',
  UPDATE_ORDER_STATUS: 'update:order_status',
  
  MANAGE_RESTAURANT: 'manage:restaurant',
  
  // User Management Permissions
  VIEW_USERS: 'view:users',
  MANAGE_USERS: 'manage:users',
  
  ADMIN_ALL: 'admin:all'
};

const roles = {
  customer: [
    allPermissions.PLACE_ORDER
  ],
  restaurant: [
    allPermissions.CREATE_MENU,
    allPermissions.EDIT_MENU,
    allPermissions.DELETE_MENU,
    allPermissions.MANAGE_MENU,
    allPermissions.MANAGE_RESTAURANT,
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