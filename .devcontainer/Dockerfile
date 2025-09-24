FROM mcr.microsoft.com/devcontainers/python:3.11

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files and install Node.js dependencies
COPY package*.json ./
COPY web/package*.json ./web/
RUN npm install && cd web && npm install

# Copy the rest of the application
COPY . .

# Expose ports
EXPOSE 8089 5173

# Set default command
CMD ["bash"]
