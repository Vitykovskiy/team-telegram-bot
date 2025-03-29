import { Module } from '@nestjs/common';
import { TaskManagerModule } from './task-manager/task-manager.module';
import { VectorStoreService } from './vector-store/vector-store.service';
import { ToolsService } from './tools.service';

@Module({
    imports: [TaskManagerModule],
    exports: [TaskManagerModule, VectorStoreService],
    providers: [VectorStoreService, ToolsService]
})
export class ToolsModule { }
