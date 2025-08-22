"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorStatus = exports.SensorType = exports.TankStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["USER"] = "USER";
})(UserRole || (exports.UserRole = UserRole = {}));
var TankStatus;
(function (TankStatus) {
    TankStatus["ACTIVE"] = "ACTIVE";
    TankStatus["MAINTENANCE"] = "MAINTENANCE";
    TankStatus["INACTIVE"] = "INACTIVE";
})(TankStatus || (exports.TankStatus = TankStatus = {}));
var SensorType;
(function (SensorType) {
    SensorType["TEMPERATURE"] = "TEMPERATURE";
    SensorType["PH"] = "PH";
    SensorType["OXYGEN"] = "OXYGEN";
})(SensorType || (exports.SensorType = SensorType = {}));
var SensorStatus;
(function (SensorStatus) {
    SensorStatus["ACTIVE"] = "ACTIVE";
    SensorStatus["INACTIVE"] = "INACTIVE";
    SensorStatus["MAINTENANCE"] = "MAINTENANCE";
    SensorStatus["ERROR"] = "ERROR";
})(SensorStatus || (exports.SensorStatus = SensorStatus = {}));
//# sourceMappingURL=index.js.map