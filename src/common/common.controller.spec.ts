import { Test, TestingModule } from '@nestjs/testing';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { Module } from '@nestjs/common';
import { TestBed } from '@automock/jest';

const mockCommonService = {
    createPresignedUrl: jest.fn(),
};

describe('CommonController', () => {
    let controller: CommonController;
    let commonService: CommonService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommonController],
            providers: [
                {
                    provide: CommonService,
                    useValue: mockCommonService,
                },
            ],
        }).compile();

        controller = module.get<CommonController>(CommonController);
        commonService = module.get<CommonService>(CommonService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call createPresignedUrl', () => {
        const result = commonService.createPresignedUrl();
        expect(commonService.createPresignedUrl).toHaveBeenCalled();
    });
});
