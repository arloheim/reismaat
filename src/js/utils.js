// Function that sanitizes a name to be used in an URL
function sanitize(name) {
  return name.toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-\s_]+/g, "")
    .replace(/[\s_]+/g, "-");
}


// Function that returns HTML for an icon
function renderIcon(icon, classes) {
  if (icon === undefined)
    return null;

  let match = icon.match(/^(?:(fa[srb]|svg):)?(.*)$/);

  let type = match !== null && match[1] !== undefined ? match[1] : 'fas';
  let id = match !== null ? match[2] : icon;

  if (type === 'fas')
    return `<i class="fa-solid ${classes} fa-${id}"></i>`;
  else if (type === 'far')
    return `<i class="fa-regular ${classes} fa-${id}"></i>`;
  else if (type === 'fab')
    return `<i class="fa-brands ${classes} fa-${id}"></i>`;
  else if (type === 'svg')
    return `<img class="svg-icon ${classes}" src="/assets/images/icons/${id}.svg">`;
  else
    return null;
}


// Define the exports
module.exports = {sanitize, renderIcon};