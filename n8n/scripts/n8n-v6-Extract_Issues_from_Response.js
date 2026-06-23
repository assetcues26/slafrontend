const items = $input.all();
const allIssues = [];
for (const item of items) {
  const response = item.json;
  if (response.issues && Array.isArray(response.issues)) allIssues.push(...response.issues);
}
return allIssues.map(issue => ({ json: issue }));