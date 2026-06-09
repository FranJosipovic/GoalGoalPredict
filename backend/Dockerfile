# Build context = backend/ (set Railway "Root Directory" to backend)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore (cached layer): copy only project files first
COPY backend.slnx ./
COPY GoalGoalPredict.Domain/*.csproj GoalGoalPredict.Domain/
COPY GoalGoalPredict.Application/*.csproj GoalGoalPredict.Application/
COPY GoalGoalPredict.Infrastructure/*.csproj GoalGoalPredict.Infrastructure/
COPY GoalGoalPredict.API/*.csproj GoalGoalPredict.API/
RUN dotnet restore GoalGoalPredict.API/GoalGoalPredict.API.csproj

# Copy the rest and publish
COPY . .
RUN dotnet publish GoalGoalPredict.API/GoalGoalPredict.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "GoalGoalPredict.API.dll"]
