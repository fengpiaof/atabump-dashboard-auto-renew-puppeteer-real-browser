import { RenewalConfig } from '../types';
export declare class ConfigLoader {
    static loadFromFile(configPath: string): RenewalConfig;
    static loadFromObject(configObj: Partial<RenewalConfig>): RenewalConfig;
    private static validateAndNormalize;
    static getDefaultTemplate(): Partial<RenewalConfig>;
}
//# sourceMappingURL=loader.d.ts.map