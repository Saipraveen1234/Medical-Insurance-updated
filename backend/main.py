from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
from sqlalchemy.orm import Session
from app.schema import schema
from app.database import engine, Base, get_db
from app.context import get_graphql_context

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create GraphQL context
async def get_context(db: Session = Depends(get_db)):
    return await get_graphql_context(db)

# Create GraphQL app with context
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context
)

# Include GraphQL routes
app.include_router(graphql_app, prefix="/graphql")