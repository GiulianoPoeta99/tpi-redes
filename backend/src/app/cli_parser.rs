// Command line argument parsing
use clap::Parser;
use crate::cli::CommandLineInterface;

pub struct CliParser;

impl CliParser {
    pub fn parse() -> CommandLineInterface {
        CommandLineInterface::parse()
    }
    
    pub fn parse_from<I, T>(args: I) -> CommandLineInterface
    where
        I: IntoIterator<Item = T>,
        T: Into<std::ffi::OsString> + Clone,
    {
        CommandLineInterface::parse_from(args)
    }
}