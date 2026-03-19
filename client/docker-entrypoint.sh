#!/bin/sh
set -e

# Replace the default API base URL with the actual server URL at runtime
if [ -n "$API_BASE_URL" ]; then
  find /usr/share/nginx/html -name '*.js' -exec \
    sed -i "s|http://localhost:8000/api|${API_BASE_URL}|g" {} +
fi

exec "$@"
