import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Video extends BaseEntity {
    @PrimaryGeneratedColumn({ type: "bigint", unsigned: true })
    id: number;

    @Column({ type: "varchar", length: 255 })
    filename: string;

    @Column({ type: "varchar", length: 255 })
    originalName: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "varchar", length: 255 })
    mimeType: string;

    @Column({ type: "bigint" })
    size: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    depthFilename: string;

    @Column({ type: "boolean", default: false })
    isGeneratingDepth: boolean;

    @Column({ type: "boolean", default: false })
    depthGenerationFailed: boolean;

    @Column({ type: "json", nullable: true })
    trackingData: {
        objects: {
            id: string;
            name: string;
            color: string;
            autoTrack?: {
                videoId: string;
                totalFrames: number;
            };
            tracking: {
                frameNumber: number;
                x: number;
                y: number;
                z?: number;
            }[];
        }[];
    };

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}