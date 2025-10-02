/**
 * Date Helper Utilities
 * Các function tiện ích xử lý ngày tháng
 */

/**
 * Kiểm tra date có hợp lệ không
 * @param {*} date - Date object hoặc string
 * @returns {Boolean}
 */
const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

/**
 * Kiểm tra date có trong quá khứ không
 * @param {*} date - Date object hoặc string
 * @returns {Boolean}
 */
const isPastDate = (date) => {
  if (!isValidDate(date)) return false;
  const dateObj = new Date(date);
  const now = new Date();
  return dateObj < now;
};

/**
 * Kiểm tra date có trong tương lai không
 * @param {*} date - Date object hoặc string
 * @returns {Boolean}
 */
const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  const dateObj = new Date(date);
  const now = new Date();
  return dateObj > now;
};

/**
 * Format date thành string YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {String}
 */
const formatDateToYYYYMMDD = (date) => {
  if (!isValidDate(date)) return null;
  const dateObj = new Date(date);
  return dateObj.toISOString().split('T')[0];
};

/**
 * Lấy ngày đầu tháng
 * @param {Number} year - Năm
 * @param {Number} month - Tháng (1-12)
 * @returns {Date}
 */
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1);
};

/**
 * Lấy ngày cuối tháng
 * @param {Number} year - Năm
 * @param {Number} month - Tháng (1-12)
 * @returns {Date}
 */
const getLastDayOfMonth = (year, month) => {
  return new Date(year, month, 0, 23, 59, 59, 999);
};

/**
 * Thêm số ngày vào date
 * @param {Date} date - Date gốc
 * @param {Number} days - Số ngày cần thêm
 * @returns {Date}
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Thêm số giờ vào date
 * @param {Date} date - Date gốc
 * @param {Number} hours - Số giờ cần thêm
 * @returns {Date}
 */
const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Tính số ngày giữa 2 dates
 * @param {Date} date1 - Date 1
 * @param {Date} date2 - Date 2
 * @returns {Number} Số ngày (có thể âm)
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / oneDay);
};

/**
 * Tính số giờ giữa 2 dates
 * @param {Date} date1 - Date 1
 * @param {Date} date2 - Date 2
 * @returns {Number} Số giờ (có thể âm)
 */
const hoursBetween = (date1, date2) => {
  const oneHour = 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / oneHour);
};

/**
 * Kiểm tra 2 dates có cùng ngày không (bỏ qua giờ)
 * @param {Date} date1 - Date 1
 * @param {Date} date2 - Date 2
 * @returns {Boolean}
 */
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Lấy ngày hôm nay (00:00:00)
 * @returns {Date}
 */
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Lấy ngày mai (00:00:00)
 * @returns {Date}
 */
const getTomorrow = () => {
  return addDays(getToday(), 1);
};

/**
 * Lấy ngày hôm qua (00:00:00)
 * @returns {Date}
 */
const getYesterday = () => {
  return addDays(getToday(), -1);
};

/**
 * Format date thành relative time (e.g., "2 ngày trước", "trong 3 giờ")
 * @param {Date} date - Date cần format
 * @returns {String}
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = date - now;
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isPast = diffMs < 0;

  if (diffSeconds < 60) {
    return isPast ? 'vừa xong' : 'ngay bây giờ';
  } else if (diffMinutes < 60) {
    return isPast
      ? `${diffMinutes} phút trước`
      : `trong ${diffMinutes} phút`;
  } else if (diffHours < 24) {
    return isPast ? `${diffHours} giờ trước` : `trong ${diffHours} giờ`;
  } else {
    return isPast ? `${diffDays} ngày trước` : `trong ${diffDays} ngày`;
  }
};

/**
 * Parse date từ nhiều formats
 * @param {String|Date} dateInput - Date input
 * @returns {Date|null}
 */
const parseDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  const date = new Date(dateInput);
  return isValidDate(date) ? date : null;
};

module.exports = {
  isValidDate,
  isPastDate,
  isFutureDate,
  formatDateToYYYYMMDD,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  addDays,
  addHours,
  daysBetween,
  hoursBetween,
  isSameDay,
  getToday,
  getTomorrow,
  getYesterday,
  formatRelativeTime,
  parseDate
};
