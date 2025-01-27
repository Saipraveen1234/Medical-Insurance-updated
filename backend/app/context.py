from typing import Any
from strawberry.fastapi import BaseContext
from sqlalchemy.orm import Session

class GraphQLContext(BaseContext):
    def __init__(self, db: Session):
        super().__init__()
        self.db = db

async def get_graphql_context(db: Session) -> GraphQLContext:
    return GraphQLContext(db=db)