import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  assignee: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column('text')
  description: string;

  @Column('json', { nullable: true })
  subtasks: { id: string; title: string }[];

  @CreateDateColumn()
  created_at: Date;
}
