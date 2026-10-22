FROM evoapicloud/evolution-api:v2.3.7

# Set default port
ENV PORT=8080
EXPOSE 8080

# Start Evolution API
CMD ["npm", "run", "start:prod"]
